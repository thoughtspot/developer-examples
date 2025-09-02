import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./clients/supabase";
import { MCPServers } from "./mcp/mcp-servers";
import { decodeState, OauthProvider } from "./mcp/oauth";
import { Attachment, MCPServerMetadata, MCPServerMetadataWithToken } from "./types";
import { OpenAIProvider } from "./clients/ai/openai";
import { MCPServer } from "./mcp/mcp-server";
import { getConnector } from "./mcp/connectors";

export class Context {
    public supabaseClient: SupabaseClient;
    public mcpServers: MCPServers;
    private redirectUrl: string;

    constructor(authorization: string, public readonly appUrl: string) {
        this.supabaseClient = createClient(authorization);
        this.redirectUrl = `${appUrl}/oauth/callback`;
        this.mcpServers = new MCPServers(this.supabaseClient, this.redirectUrl);
    }

    async addMCPServer(mcpServer: MCPServerMetadata) {
        return this.mcpServers.upsert(mcpServer);
    }

    async addMCPServerFromConnector(connectorId: string) {
        const connector = await getConnector(this.supabaseClient, connectorId);
        return this.mcpServers.upsert({
            name: connector.name,
            url: connector.url,
            logoUrl: connector.logo_url,
            oauthClientInfo: connector.oauth_client_info
        });
    }

    async listMCPServers(): Promise<MCPServerMetadata[]> {
        return await this.mcpServers.list();
    }

    async getMCPServer(serverId: string) {
        return await this.mcpServers.get(serverId);
    }
    te
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
        try {
            const server = await this.mcpServers.get(serverId);
            await server.connect(onRedirect);
        } catch (error) {
            console.error(error);
            return { error };
        }

        return { error: null };
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

    async sendMessage(message: string, attachments: Attachment[], mcpServers: MCPServerMetadata[], enabledDefaultTools: string[], referenceId?: string) {
        const aiProvider = new OpenAIProvider();
        const mcpServersWithToken: MCPServerMetadataWithToken[] = await Promise.all(
            mcpServers.map(async metadata => {
                const oauthClient = new OauthProvider(metadata);
                let tokens = await oauthClient.tokens();
                if (tokens.expires_at && tokens.expires_at < Date.now()) {
                    await oauthClient.refreshAuth();
                    tokens = await oauthClient.tokens();
                }
                return {
                    ...metadata,
                    authorizationToken: tokens.access_token,
                };
            })
        );
        return await aiProvider.getStreamResponse(
            message, attachments, mcpServersWithToken, enabledDefaultTools, referenceId
        );
    }
}