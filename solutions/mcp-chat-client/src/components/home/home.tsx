import { Button, Flex, Layout } from "antd";
import { useState } from "react";
import { FormOutlined } from "@ant-design/icons";
import "./home.scss";
import { Chat } from "../chat/chat";
import { MenuComponent } from "../menu/menu";

export const Home = () => {
    const [chatKey, setChatKey] = useState('0');
    return <Layout className="home">
        <Layout.Sider width={300}>
            <MenuComponent />
        </Layout.Sider>
        <Layout>
            <Layout.Header style={{ padding: 0 }}>
                <Flex style={{ height: '100%', width: '100%' }} align="center" justify="space-between">
                    <img src="https://cdn.brandfetch.io/idlcYXlhbB/w/400/h/400/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1667743633463" style={{ width: 64, height: 64 }} />
                    <Button type="text" icon={<FormOutlined />} style={{ marginRight: 48 }} onClick={() => setChatKey(Math.random() + '')}>New Chat</Button>
                </Flex>
            </Layout.Header>
            <Layout.Content>    
                <Chat style={{ height: '100%', width: '100%', padding: '24px 0 24px 24px' }} key={chatKey}/>            
            </Layout.Content>
        </Layout>
    </Layout>
}