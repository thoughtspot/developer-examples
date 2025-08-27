import { SupabaseClient } from "@supabase/supabase-js";
import { MCPServer } from "./mcp-server";
import type { MCPServerMetadata } from "../types";
import { convertToCamelCaseObjectKeys, convertToSnakeCaseObjectKeys } from "../util";

export class MCPServers {
    private supabaseClient: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    async list() {
        const { data, error } = await this.supabaseClient.from('mcp_servers').select('*');
        if (error) {
            throw error;
        }
        return data.map(convertToCamelCaseObjectKeys) as unknown as MCPServerMetadata[];
    }

    async get(id: string) {
        const { data, error } = await this.supabaseClient.from('mcp_servers').select('*').eq('id', id);
        if (error) {
            throw error;
        }
        return new MCPServer(
            data[0] as unknown as MCPServerMetadata,
            () => this.setIsConnected(id, true),
            () => this.setIsConnected(id, false)
        );
    }

    async upsert(mcpServer: MCPServerMetadata) {
        const mcpServerSnakeCase = convertToSnakeCaseObjectKeys(mcpServer);
        const { data, error } = await this.supabaseClient.from('mcp_servers').upsert(mcpServerSnakeCase);
        if (error) {
            throw error;
        }
        return data;
    }

    async delete(id: string) {
        const { error } = await this.supabaseClient.from('mcp_servers').delete().eq('id', id);
        if (error) {
            throw error;
        }
    }

    async setIsConnected(id: string, isConnected: boolean) {
        const { data, error } = await this.supabaseClient.from('mcp_servers').update({ "is_connected": isConnected }).eq('id', id);
        if (error) {
            throw error;
        }
        return data;
    }
}