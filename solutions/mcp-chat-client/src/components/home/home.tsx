import { Button, Flex, Layout } from "antd";
import { FormOutlined } from "@ant-design/icons";
import "./home.scss";
import { Chat } from "../chat/chat";
import { MenuComponent } from "../menu/menu";

export const Home = () => {
    return <Layout className="home">
        <Layout.Sider width={300}>
            <MenuComponent />
        </Layout.Sider>
        <Layout.Content>
            <Flex style={{ height: '100%', width: '100%', padding: 24 }}>
                <img src="https://cdn.brandfetch.io/idlcYXlhbB/w/400/h/400/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1667743633463" style={{ width: 64, height: 64, margin: '-18px 0 0 -18px' }} />
                <Chat style={{ margin: '0 auto' }}/>
                <Button type="text" icon={<FormOutlined />}>New Chat</Button>
            </Flex>
        </Layout.Content>
    </Layout>
}