import { Button, Flex, Typography } from "antd"
import { FormOutlined, PlusOutlined } from "@ant-design/icons"


export const History = ({ style }: { style?: React.CSSProperties }) => {
    return <Flex vertical gap={12} align="flex-start" className="history" style={{ ...style }}>
        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Typography.Text type="secondary">Chats</Typography.Text>
            <Button icon={<PlusOutlined />} size="small"></Button>
        </Flex>
        <Typography.Text>Sales last 30 days</Typography.Text>
        <Typography.Text>Marketing campaigns analysis</Typography.Text>
    </Flex>
}