import _ from 'lodash';
import { useState, useEffect } from 'react';
import { listMCPServers, listMCPServerResources } from '../services/mcp';
import type { MCPServerMetadata } from '../../backend/types';
import { useMCPContext } from '../contexts/mcp-context';

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
    const { mcpServers, loading: serverListLoading } = useMCPContext();
    const [mcpServersWithResources, setMcpServersWithResources] = useState<MCPServerWithResources[]>([]);


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMCPServersAndResources = async () => {
        if (mcpServers?.length === 0) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // For each connected server, fetch its resources
            const serversWithResources = await Promise.all(
                mcpServers.map(async (server) => {
                    if (!server.isConnected) {
                        return { ...server, resources: [] };
                    }

                    // If the server is already in the list, return the server with the resources
                    const serverWithResources = mcpServersWithResources.find(server => server.id === server.id);
                    if (serverWithResources) {
                        return { ...server, resources: serverWithResources.resources };
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

            setMcpServersWithResources(serversWithResources);
        } catch (error) {
            console.error('Error fetching MCP servers and resources:', error);
            setError('Failed to fetch MCP servers and resources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMCPServersAndResources();
    }, [mcpServers]);


    const serversWithResources = mcpServersWithResources.filter(server => server.resources.length > 0);

    return {
        serversWithResources,
        loading: serverListLoading || loading,
        error,
        refetch: fetchMCPServersAndResources
    };
};
