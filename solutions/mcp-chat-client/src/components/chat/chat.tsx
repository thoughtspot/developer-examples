import { Button, Dropdown, Flex, Input, Space } from "antd"
import { PlusOutlined, SendOutlined, UploadOutlined } from "@ant-design/icons"

export const Chat = ({ style }: { style?: React.CSSProperties }) => {
    return <Flex vertical gap={12} className="chat" style={{ minWidth: 600, maxWidth: 800, flex: 1, height: '100%', ...style }}>
        <div>messages</div>
        <Space.Compact style={{ width: '100%', margin: 'auto 0 0 0' }}>
            <Input addonBefore={<Dropdown placement="topRight" trigger={['click']} menu={{
                items: [{
                    key: '1',
                    label: 'Upload File',
                    icon: <UploadOutlined />,
                }],
            }}><PlusOutlined /></Dropdown>} size="large" placeholder="Ask anything" style={{ flex: 1 }} />
            <Button size="large" icon={<SendOutlined />}></Button>
        </Space.Compact>
    </Flex>
};
