import { Button, Collapse, Dropdown, Flex, Switch, Tabs, Typography } from "antd";
import { EllipsisOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import "./mcp-list.scss";
import { useState } from "react";
import { AddMCPModal } from "./add-mcp-modal";

export const MCPList = () => {
    const [addMCPModalOpen, setAddMCPModalOpen] = useState(false);
    return <Flex className="mcp-list" vertical gap={12} align="flex-start">
        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Typography.Text type="secondary">Connections</Typography.Text>
            <Button icon={<PlusOutlined />} size="small" onClick={() => setAddMCPModalOpen(true)}></Button>
        </Flex>
        <Collapse ghost items={[{
            key: '1',
            label: <Flex align="center">
                <img src="https://cdn.brandfetch.io/idJ_HhtG0Z/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1745381296843" style={{ width: 36, height: 36 }}></img>
                <div>Slack</div>
            </Flex>,
            children: <Flex vertical gap={8}>
                    <Flex justify="space-between" align="center">
                        <div>Search</div>
                        <Switch size="small" />
                    </Flex>
                    <Flex justify="space-between" align="center">
                        <div>Send Message</div>
                        <Switch size="small" />
                    </Flex>
                </Flex>,
            extra: <Dropdown trigger={['click']} menu={{
                items: [{
                    key: '1',
                    label: 'Delete',
                }],
            }}>
                <EllipsisOutlined className="menu-btn"/>
            </Dropdown>,
        }]} />
        <AddMCPModal 
            open={addMCPModalOpen} 
            onCancel={() => setAddMCPModalOpen(false)} 
            onAdd={() => {
                setAddMCPModalOpen(false);
                // TODO: Refresh the MCP list after adding
            }} 
        />
    </Flex>
}