import { apiCall } from "./api-call";

export const listMCPServers = async () => {
    const resp = await apiCall('/mcp/servers/list');
    return resp.data;
}