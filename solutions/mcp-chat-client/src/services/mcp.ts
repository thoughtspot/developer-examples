import type { MCPServerMetadata } from "../types/mcp";
import { apiCall } from "./api-call";

export const listMCPServers = async () => {
    const resp = await apiCall('/mcp/servers/list');
    return resp.data;
}

export const listConnectors = async () => {
    const resp = await apiCall('/mcp/connectors/list');
    return resp.data;
}

export const addMCPServer = async (mcpServer: Partial<MCPServerMetadata>) => {
    const resp = await apiCall('/mcp/servers/add', {
        method: 'POST',
        body: mcpServer
    });
    return resp.data;
}

export const listMCPServerTools = async (serverId: string) => {
    const resp = await apiCall(`/mcp/${serverId}/tools/list`);
    return resp.data;
}

export const listMCPServerResources = async (serverId: string) => {
    const resp = await apiCall(`/mcp/${serverId}/resources/list`);
    return resp.data;
}

export const readMCPServerResource = async (serverId: string, resourceURI: string) => {
    const resp = await apiCall(`/mcp/${serverId}/resources/read?resourceURI=${resourceURI}`);
    return resp.data;
}

export const connectMCPServer = async (serverId: string) => {
    return apiCall(`/mcp/${serverId}/connect`);
}

export const finishMCPServerOAuth = async (code: string, state: string) => {
    return apiCall('/mcp/oauth/callback', {
        method: 'POST',
        body: { code, state }
    });
}