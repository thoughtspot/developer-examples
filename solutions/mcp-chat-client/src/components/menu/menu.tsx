import { Flex, Menu } from "antd";
import { AppstoreOutlined, MessageOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useState } from "react";
import { ToolsWrapper } from "../tools-wrapper/tools-wrapper";
import { History } from "../history/history";
import "./menu.scss";

export const MenuComponent = () => {
    const [selectedKey, setSelectedKey] = useState('mcp-servers');

    const handleMenuClick = ({ key }: { key: string }) => {
        setSelectedKey(key);
    };

    const renderContent = () => {
        switch (selectedKey) {
            case 'mcp-servers':
                return <ToolsWrapper />;
            case 'history':
                return <History />;
            default:
                return <ToolsWrapper />;
        }
    };

    return (
        <Flex className="sider">
            <Menu 
                className="menu" 
                mode="inline" 
                selectedKeys={[selectedKey]}
                onClick={handleMenuClick}
                items={[ {
                    key: 'history',
                    label: null,
                    icon: <MessageOutlined style={{ fontSize: 24 }}/>,
                }, {
                    key: 'mcp-servers',
                    label: null,
                    icon: <AppstoreOutlined style={{ fontSize: 24 }} />,
                }]} 
            />
            <div className="menu-content">
                {renderContent()}
            </div>
        </Flex>
    );
};
