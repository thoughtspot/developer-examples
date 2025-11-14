import { Flex, Card, Typography, Modal, Spin } from "antd";
import { MCPResource } from "../../hooks";
import { CloseOutlined, EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { readMCPServerResource } from "../../services/mcp";

export const SelectedResources = ({ resources, onRemoveResource }: { resources: MCPResource[], onRemoveResource: (resource: MCPResource) => void }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
    const [resourceContent, setResourceContent] = useState<string>('');
    const [loadingContent, setLoadingContent] = useState(false);

    const onViewResource = async (resource: MCPResource) => {
        setSelectedResource(resource);
        setIsModalVisible(true);
        setLoadingContent(true);
        
        try {
            const content = resource.content;
            const contentString = content.map((item: any) => item.text).join('\n');
            setResourceContent(contentString || 'No content available');
        } catch (error) {
            console.error('Error reading resource content:', error);
            setResourceContent('Error reading resource content');
        } finally {
            setLoadingContent(false);
        }
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setSelectedResource(null);
        setResourceContent('');
    };

    return (
        <>
            <Flex gap={8} style={{ height: '100px'}}>
                {resources.map(resource => (
                    <Card onClick={() => onViewResource(resource)} key={resource.uri} variant="borderless" style={{ cursor: 'pointer' }}>
                        <Flex vertical gap={8}>
                            <Flex align="center" gap={8}>
                                <img src={resource.server.logoUrl} style={{ width: 16, height: 16 }} />
                                <Typography.Text type="secondary">{resource.server.name}</Typography.Text>
                                <CloseOutlined 
                                    style={{ marginLeft: 'auto', color: 'rgba(255, 255, 255, 0.2)' }} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveResource(resource);
                                    }} 
                                />
                            </Flex>
                            <Flex vertical gap={8}>
                                <Typography.Text>{resource.name}</Typography.Text>
                            </Flex>
                        </Flex>
                    </Card>
                ))}
            </Flex>

            <Modal
                title={
                    <Flex align="center" gap={8}>
                        <img src={selectedResource?.server.logoUrl} style={{ width: 20, height: 20 }} />
                        <span>{selectedResource?.name}</span>
                    </Flex>
                }
                centered
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={800}
                style={{ top: 20 }}
            >
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                    {loadingContent ? (
                        <Flex justify="center" align="center" style={{ height: 200 }}>
                            <Spin size="large" />
                        </Flex>
                    ) : (
                        <div style={{ textAlign: 'left' }}>
                            <Typography.Paragraph style={{
                                textAlign: 'left', 
                                padding: 16, 
                                borderRadius: 6,
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-line',
                                overflow: 'auto',
                                display: 'block'
                            }}>
                                {resourceContent}
                            </Typography.Paragraph>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};