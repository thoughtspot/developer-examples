import _ from 'lodash';
import { useState, useEffect } from 'react';
import { listMCPServers, listMCPServerResources } from '../services/mcp';
import type { MCPServerMetadata } from '../../api/types';

export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    server: MCPServerMetadata;
    content?: any[];
}

export interface MCPServerWithResources extends MCPServerMetadata {
    resources: MCPResource[];
}

export const useMCPResources = () => {
    const [mcpServers, setMcpServers] = useState<MCPServerWithResources[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMCPServersAndResources = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch all MCP servers
            const servers = await listMCPServers(true);

            // For each connected server, fetch its resources
            const serversWithResources = await Promise.all(
                servers.map(async (server) => {
                    if (!server.isConnected) {
                        return { ...server, resources: [] };
                    }

                    try {
                        const resources = await listMCPServerResources(server.id);
                        return {
                            ...server,
                            resources: resources
                                .map(resource => ({ ...resource, server }))
                                .filter(resource => resource.mimeType === 'text/plain') || []
                        };
                    } catch (error) {
                        console.error(`Failed to fetch resources for server ${server.id}:`, error);
                        return { ...server, resources: [] };
                    }
                })
            );

            setMcpServers(serversWithResources);
        } catch (error) {
            console.error('Error fetching MCP servers and resources:', error);
            setError('Failed to fetch MCP servers and resources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMCPServersAndResources();
    }, []);


    const serversWithResources = mcpServers.filter(server => server.resources.length > 0);

    return {
        serversWithResources,
        loading,
        error,
        refetch: fetchMCPServersAndResources
    };
};
