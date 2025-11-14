import React, { useState, useMemo } from 'react';
import { Popover, Input, Spin, Typography, List, Select, Flex } from 'antd';
import { SearchOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import { useMCPResources, type MCPResource } from '../../hooks/use-mcp-resources';
import './mcp-resources-dropdown.scss';

const { Text } = Typography;

interface MCPResourcesDropdownProps {
    onResourceSelect?: (serverId: string, resource: MCPResource) => void;
    children: React.ReactNode;
}

export const MCPResourcesDropdown: React.FC<MCPResourcesDropdownProps> = ({
    onResourceSelect,
    children
}) => {
    const { serversWithResources, loading, error } = useMCPResources();
    const [searchText, setSearchText] = useState('');
    const [selectedServer, setSelectedServer] = useState<string>('all');
    const [open, setOpen] = useState(false);

    // Create server options for the select component
    const serverOptions = useMemo(() => {
        const options = [
            { value: 'all', label: 'All' }
        ];
        
        serversWithResources.forEach(server => {
            options.push({
                value: server.id,
                label: server.name
            });
        });
        
        return options;
    }, [serversWithResources]);

    // Filter and flatten resources based on selected server and search text
    const filteredResources = useMemo(() => {
        let resources: Array<{ serverId: string; serverName: string; resource: MCPResource }> = [];

        if (selectedServer === 'all') {
            // Collect resources from all servers
            serversWithResources.forEach(server => {
                server.resources.forEach(resource => {
                    resources.push({
                        serverId: server.id,
                        serverName: server.name,
                        resource
                    });
                });
            });
        } else {
            // Collect resources from selected server only
            const selectedServerData = serversWithResources.find(server => server.id === selectedServer);
            if (selectedServerData) {
                selectedServerData.resources.forEach(resource => {
                    resources.push({
                        serverId: selectedServerData.id,
                        serverName: selectedServerData.name,
                        resource
                    });
                });
            }
        }

        // Filter by search text
        if (searchText.trim()) {
            resources = resources.filter(item =>
                item.resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
                item.resource.description?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.resource.uri.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        // Sort alphabetically by resource name
        return resources.sort((a, b) => {
            const nameA = a.resource.name || a.resource.uri.split('/').pop() || '';
            const nameB = b.resource.name || b.resource.uri.split('/').pop() || '';
            return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
        });
    }, [serversWithResources, selectedServer, searchText]);

    const handleResourceClick = (serverId: string, resource: MCPResource) => {
        onResourceSelect?.(serverId, resource);
        setOpen(false);
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Spin size="small" />
                    <Text style={{ marginLeft: 8 }}>Loading resources...</Text>
                </div>
            );
        }

        if (error) {
            return (
                <div style={{ padding: '16px', color: '#ff4d4f' }}>
                    <Text type="danger">Error loading resources</Text>
                </div>
            );
        }

        if (filteredResources.length === 0) {
            return (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Text type="secondary">
                        {searchText ? 'No resources found' : 'No resources available'}
                    </Text>
                </div>
            );
        }

        return (
            <Flex vertical gap={8} style={{ width: '450px', height: '500px' }}>
                {/* Server selection and search bar row */}
                <div style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid #303030',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    <Select
                        value={selectedServer}
                        onChange={setSelectedServer}
                        style={{ width: '140px' }}

                    >
                        {serverOptions.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        ))}
                    </Select>
                    
                    <Input
                        placeholder="Search resources..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ flex: 1 }}
                    />
                </div>
                
                {/* Flat resources list */}
                <div style={{ height: '100%', overflowY: 'auto' }}>
                    <List
                        size="small"
                        dataSource={filteredResources}
                        renderItem={(item) => (
                            <List.Item
                                className="mcp-resources-dropdown-item"
                                style={{ 
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #303030'
                                }}
                                onClick={() => handleResourceClick(item.serverId, item.resource)}
                            >
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                                        <Text style={{ fontSize: '12px', fontWeight: 500, maxWidth: '320px' }}>
                                            {item.resource.name || item.resource.uri.split('/').pop()}
                                        </Text>
                                        {selectedServer === 'all' && (
                                            <Text 
                                                type="secondary" 
                                                style={{ 
                                                    fontSize: '10px', 
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    marginLeft: 'auto'
                                                }}
                                            >
                                                {item.serverName}
                                            </Text>
                                        )}
                                    </div>
                                    {item.resource.description && (
                                        <div>
                                            <Typography.Paragraph type="secondary" 
                                            style={{ fontSize: '11px', maxWidth: '320px' }} ellipsis={{ tooltip: item.resource.description, rows: 2 }}>
                                                {item.resource.description}
                                            </Typography.Paragraph>
                                        </div>
                                    )}
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            </Flex>
        );
    };

    return (
        <Popover
            content={renderContent()}
            title={null}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="topRight"
        >
            {children}
        </Popover>
    );
};
