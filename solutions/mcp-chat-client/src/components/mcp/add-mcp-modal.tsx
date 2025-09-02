import { Card, Form, Input, Modal, Space, Tabs, Typography, Flex, Button, Divider, message, Spin } from "antd"
import { PlusOutlined } from "@ant-design/icons"
import { useState, useEffect } from "react"
import { addMCPServer, listConnectors, addMCPFromConnector } from "../../services/mcp"

// Define a generic connector interface based on common patterns
interface Connector {
    id: string;
    name: string;
    url: string;
    description?: string;
    logo_url?: string;
    [key: string]: any; // Allow for additional properties
}

export const AddMCPModal = ({ open, onCancel, onAdd }: { open: boolean, onCancel: () => void, onAdd: () => void }) => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [connectors, setConnectors] = useState<Connector[]>([])
    const [connectorsLoading, setConnectorsLoading] = useState(false)

    // Fetch connectors when modal opens
    useEffect(() => {
        if (open) {
            fetchConnectors()
        }
    }, [open])

    const fetchConnectors = async () => {
        setConnectorsLoading(true)
        try {
            const connectorsData = await listConnectors()
            setConnectors(connectorsData || [])
        } catch (error) {
            console.error('Error fetching connectors:', error)
            message.error('Failed to fetch connectors')
        } finally {
            setConnectorsLoading(false)
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            await addMCPServer({
                name: values.name,
                url: values.url,
                logoUrl: values.logoUrl,
                oauthClientInfo: values.clientId || values.clientSecret ? {
                    client_id: values.clientId,
                    client_secret: values.clientSecret
                } : undefined
            })
            message.success('MCP Server added successfully!')
            onAdd();
        } catch (error) {
            console.error('Error adding MCP server:', error)
            message.error('Failed to add MCP server. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleConnectorAdd = async (connector: Connector) => {
        setLoading(true)
        // Handle adding a connector - you can implement this based on your needs
        message.info(`Adding connector: ${connector.name}`);
        try {
        await addMCPFromConnector(connector.id);
        onAdd();
        message.success('Connector added successfully!')
        } catch (error) {
            console.error('Error adding MCP server from connector:', error)
            message.error('Failed to add MCP server from connector. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return <Modal
        className="add-mcp-modal"
        open={open} 
        onCancel={onCancel} 
        footer={null} 
        title={<Flex vertical>
            <Typography.Text>Add connection</Typography.Text>
            <Typography.Text type="secondary">Connect with remote tools, choose from the list below or add a custom one.</Typography.Text>
        </Flex>} 
        width={560}
        centered
    >
        <Spin spinning={loading}>
        <Tabs style={{ height: '470px'}}>
            <Tabs.TabPane tab="Connectors" key="connectors">
                {connectorsLoading ? (
                    <Flex justify="center" align="center" style={{ height: 200 }}>
                        <Typography.Text type="secondary">Loading connectors...</Typography.Text>
                    </Flex>
                ) : connectors.length > 0 ? (
                    <Flex gap={12} align="center" wrap="wrap">
                        {connectors.map((connector) => (
                            <Card 
                                key={connector.id} 
                                variant="outlined" 
                                style={{ width: 250, height: 80 }}
                            >
                                <Flex align="center" justify="space-between">
                                    <img 
                                        src={connector.logo_url || "https://cdn.brandfetch.io/idJ_HhtG0Z/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1745381296843"} 
                                        style={{ width: 48, height: 48, padding: 12, boxSizing: 'border-box' }}
                                        alt={connector.name}
                                    />
                                    <Flex vertical style={{ width: '150px' }}>
                                        <Typography.Text>{connector.name}</Typography.Text>
                                        <Typography.Text type="secondary">
                                            {connector.description || `Add ${connector.name}`}
                                        </Typography.Text>
                                    </Flex>
                                    <Button 
                                        icon={<PlusOutlined />} 
                                        size="small"
                                        onClick={() => handleConnectorAdd(connector)}
                                    />
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                ) : (
                    <Flex justify="center" align="center" style={{ height: 200 }}>
                        <Typography.Text type="secondary">No connectors available, try adding a custom one.</Typography.Text>
                    </Flex>
                )}
            </Tabs.TabPane>
            <Tabs.TabPane tab="Custom" key="custom">
                <Form 
                    form={form}
                    labelCol={{ span: 6 }} 
                    wrapperCol={{ span: 18 }}
                    onFinish={handleSubmit}
                >
                    <Form.Item required label="Name" name="name" tooltip="The name of the MCP server">
                        <Input />
                    </Form.Item>
                    <Form.Item required label="URL" name="url" tooltip="The URL of the MCP server">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Logo URL" name="logoUrl" tooltip="The URL of the MCP server logo">
                        <Input />
                    </Form.Item>
                    <Divider />
                    <div style={{ marginBottom: 24 }}>
                        <Typography.Text type="secondary">Advanced</Typography.Text>
                    </div>
                    <Form.Item label="Oauth Client ID" name="clientId" tooltip="The client ID of the MCP server">
                        <Input placeholder="Enter client ID" />
                    </Form.Item>
                    <Form.Item label="Client Secret" name="clientSecret" tooltip="The client secret of the MCP server">
                        <Input placeholder="Enter client secret" />
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Button 
                            style={{ marginTop: 24 }} 
                            type="primary" 
                            htmlType="submit"
                            loading={loading}
                        >
                                Add
                        </Button>
                    </div>
                    
                </Form>
            </Tabs.TabPane>
        </Tabs>
        </Spin>
    </Modal>
}