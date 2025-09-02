import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { MCPServerMetadata } from '../../backend/types';
import { listMCPServers } from '../services/mcp';
import { message } from 'antd';

interface MCPContextType {
    loading: boolean;
    mcpServers: MCPServerMetadata[];
    setMcpServers: (servers: MCPServerMetadata[]) => void;
    updateMcpServer: (serverId: string, updates: Partial<MCPServerMetadata>) => void;
    addMcpServer: (server: MCPServerMetadata) => void;
    removeMcpServer: (serverId: string) => void;
    enabledDefaultTools: string[];
    toggleDefaultTool: (toolId: string, enabled: boolean) => void;
    fetchMCPServers: () => void;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

export const useMCPContext = () => {
    const context = useContext(MCPContext);
    if (context === undefined) {
        throw new Error('useMCPContext must be used within an MCPProvider');
    }
    return context;
};

interface MCPProviderProps {
    children: ReactNode;
}

export const MCPProvider: React.FC<MCPProviderProps> = ({ children }) => {
    const [mcpServers, setMcpServers] = useState<MCPServerMetadata[]>([]);
    const [enabledDefaultTools, setEnabledDefaultTools] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMCPServers = async () => {
        setLoading(true);
        try {
            const servers = await listMCPServers(true);
            setMcpServers(servers || []);
        } catch (error) {
            console.error('Error fetching MCP servers:', error);
            message.error('Failed to fetch MCP servers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMCPServers();
    }, []);

    const updateMcpServer = (serverId: string, updates: Partial<MCPServerMetadata>) => {
        setMcpServers(prev => 
            prev.map(server => 
                server.id === serverId ? { ...server, ...updates } : server
            )
        );
    };

    const addMcpServer = (server: MCPServerMetadata) => {
        setMcpServers(prev => [...prev, server]);
    };

    const removeMcpServer = (serverId: string) => {
        setMcpServers(prev => prev.filter(server => server.id !== serverId));
    };

    const toggleDefaultTool = (toolId: string, enabled: boolean) => {
        setEnabledDefaultTools(prev => enabled ? [...prev, toolId] : prev.filter(id => id !== toolId));
    };

    const value: MCPContextType = {
        loading,
        mcpServers,
        setMcpServers,
        updateMcpServer,
        addMcpServer,
        removeMcpServer,
        enabledDefaultTools,
        toggleDefaultTool,
        fetchMCPServers,
    };

    return (
        <MCPContext.Provider value={value}>
            {children}
        </MCPContext.Provider>
    );
};
