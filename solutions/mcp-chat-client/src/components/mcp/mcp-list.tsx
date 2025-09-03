import { Button, Collapse, Dropdown, Flex, Switch, Skeleton, Typography, message, Spin, Tooltip } from "antd";
import { EllipsisOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import "./mcp-list.scss";
import { useState, useEffect } from "react";
import { AddMCPModal } from "./add-mcp-modal";
import { listMCPServerTools, connectMCPServer } from "../../services/mcp";
import type { MCPServerMetadata } from "../../../backend/types";
import { useMCPContext } from "../../contexts/mcp-context";

export const MCPList = () => {
    const [addMCPModalOpen, setAddMCPModalOpen] = useState(false);
    const { mcpServers, setMcpServers, loading, fetchMCPServers } = useMCPContext();
    const [mcpServerTools, setMcpServerTools] = useState<Record<string, any[]>>({});

    
    const fetchMCPServerTools = async (serverId: string) => {
        try {
            const { tools } = await listMCPServerTools(serverId);
            setMcpServerTools(mcpServerTools => ({
                ...mcpServerTools,
                [serverId]: tools,
            }));
        } catch (error) {
            console.error('Error fetching MCP server tools:', error);
            message.error('Failed to fetch MCP server tools');
            // Set the isConnected to false for the server
            setMcpServers(mcpServers.map(server => server.id === serverId ? { ...server, isConnected: false } : server));
        }
    };

    useEffect(() => {
        mcpServers.forEach(server => {
            if (mcpServerTools[server.id] || !server.isConnected) {
                return;
            }
    
            fetchMCPServerTools(server.id);
        });
        
    }, [mcpServers]);

    const handleToggleTool = (serverId: string, toolName: string, enabled: boolean) => {
        // TODO: Implement tool toggle functionality
        console.log(`Toggling ${toolName} for server ${serverId} to ${enabled}`);
    };

    const handleConnect = async (serverId: string) => {
        const { success,redirectUrl } = await connectMCPServer(serverId);
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }

        if (success) {
            // Refresh the list of MCP servers
            fetchMCPServers();
        }
    };

    const renderMCPServerItem = (server: MCPServerMetadata) => ({
        key: server.id,
        label: (
            <Flex align="center" gap={8}>
                <img 
                    src={server.logoUrl || "https://cdn.brandfetch.io/idJ_HhtG0Z/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1745381296843"} 
                    style={{ width: 24, height: 24 }}
                    alt={server.name}
                />
                <div>{server.name}</div>
            </Flex>
        ),
        children: server.isConnected ? (
            <Flex vertical gap={8}>
                {mcpServerTools[server.id] ? (
                    mcpServerTools[server.id].map((tool, index) => (
                        <Flex key={index} vertical gap={8}>
                            <Tooltip title={<Flex vertical><Typography.Text>{tool.annotations?.title || tool.name }</Typography.Text><Typography.Text type="secondary">{tool.description}</Typography.Text></Flex>}>
                            <Flex justify="space-between" align="center">
                                    <Typography.Text style={{ width: 150, textAlign: 'left' }} 
                                        ellipsis>    
                                            {tool.annotations?.title || tool.name }
                                        </Typography.Text>
                                <Tooltip title="Ability to disable, coming soon.">
                                <Switch 
                                    checked={server.allowedTools ? server.allowedTools?.includes(tool) : true}
                                    disabled={true}
                                    size="small" 
                                        onChange={(checked) => handleToggleTool(server.id, tool, checked)}
                                    />
                                </Tooltip>
                            </Flex>
                            </Tooltip>
                        </Flex>
                    ))
                ): <Spin />}
            </Flex>
        ) : <Button size="small" onClick={() => handleConnect(server.id)}>Connect</Button>,
        extra: (
                <Dropdown 
                trigger={['click']} 
                menu={{
                    items: [{
                        key: 'delete',
                        label: 'Delete',
                        disabled: true, // Disabled until delete functionality is implemented
                        onClick: () => message.info('Delete functionality coming soon')
                    }],
                }}
            >
                <EllipsisOutlined className="menu-btn"/>
            </Dropdown>
        ),
    });

    return (
        <Flex className="mcp-list" vertical gap={12} align="flex-start" style={{ height: '100%' }}>
            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                <Typography.Text type="secondary">Connections</Typography.Text>
                <Button icon={<PlusOutlined />} size="small" onClick={() => setAddMCPModalOpen(true)}></Button>
            </Flex>
            
            {loading ? (
                
                    <Skeleton active paragraph={{ rows: 4 }} />
                
            ) : mcpServers.length === 0 ? (
                <div>No MCP servers found. Add one to get started.</div>
            ) : (
                <Collapse style={{ width: '100%' }}  ghost 
                    defaultActiveKey={mcpServers.filter(server => !server.isConnected).map(server => server.id)} 
                    items={mcpServers.map(renderMCPServerItem)} 
                />
            )}
            
            <AddMCPModal 
                open={addMCPModalOpen} 
                onCancel={() => setAddMCPModalOpen(false)} 
                onAdd={() => {
                    setAddMCPModalOpen(false);
                    fetchMCPServers(); // Refresh the list after adding
                }} 
            />
        </Flex>
    );
}