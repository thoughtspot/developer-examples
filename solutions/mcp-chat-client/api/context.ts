import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase";
import { MCPServers } from "./mcp/mcp-servers";
import type { MCPServerMetadata } from "./types";
import { decodeState } from "./mcp/oauth";

export class Context {
    public supabaseClient: SupabaseClient;
    public mcpServers: MCPServers;

    constructor(authorization: string, public readonly appUrl: string) {
        this.supabaseClient = createClient(authorization);
        this.mcpServers = new MCPServers(this.supabaseClient);
    }

    async addMCPServer(mcpServer: MCPServerMetadata) {
        return await this.mcpServers.upsert(mcpServer);
    }

    async listMCPServers(): Promise<MCPServerMetadata[]> {
        return await this.mcpServers.list();
    }

    async getMCPServer(serverId: string) {
        return await this.mcpServers.get(serverId);
    }

    async listMCPServerTools(serverId: string) {
        const server = await this.mcpServers.get(serverId);
        const tools = await server.listTools();
        return tools;
    }

    async listMCPServerResources(serverId: string) {
        const server = await this.mcpServers.get(serverId);
        const resources = await server.listResources();
        return resources;
    }

    async readMCPServerResource(serverId: string, resourceURI: string) {
        const server = await this.mcpServers.get(serverId);
        const resource = await server.readResource(resourceURI);
        return resource;
    }

    async connectMCPServer(serverId: string, onRedirect: (url: string) => void) {
        const server = await this.mcpServers.get(serverId);
        await server.connect(`${this.appUrl}/oauth/callback`, onRedirect);
    }

    async finishMCPServerOAuth(code: string, state: string) {
        const { serverId } = decodeState(state);
        const server = await this.mcpServers.get(serverId);
        await server.finishOAuth(code);
    }

    async disconnectMCPServer(serverId: string) {
        const server = await this.mcpServers.get(serverId);
        await server.disconnect();
    }
}