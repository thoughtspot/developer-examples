import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { MCPServerMetadata } from '../../api/types';

interface MCPContextType {
    mcpServers: MCPServerMetadata[];
    setMcpServers: (servers: MCPServerMetadata[]) => void;
    updateMcpServer: (serverId: string, updates: Partial<MCPServerMetadata>) => void;
    addMcpServer: (server: MCPServerMetadata) => void;
    removeMcpServer: (serverId: string) => void;
    enabledDefaultTools: string[];
    toggleDefaultTool: (toolId: string, enabled: boolean) => void;
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
        mcpServers,
        setMcpServers,
        updateMcpServer,
        addMcpServer,
        removeMcpServer,
        enabledDefaultTools,
        toggleDefaultTool,
    };

    return (
        <MCPContext.Provider value={value}>
            {children}
        </MCPContext.Provider>
    );
};
