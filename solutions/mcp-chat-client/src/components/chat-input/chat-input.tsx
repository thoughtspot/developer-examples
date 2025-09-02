import { Button, Input, InputRef, Space } from "antd"
import { PlusOutlined, ArrowUpOutlined, XFilled } from "@ant-design/icons"
import { MCPResourcesDropdown } from "../mcp-resources-dropdown"
import type { MCPResource } from "../../hooks"
import { useRef, useState } from "react";

interface ChatInputProps {
    onResourceSelect?: (serverId: string, resource: MCPResource) => void;
    onSendMessage?: (text: string) => void;
    inProgress?: boolean;
}

export const ChatInput = ({ onResourceSelect, onSendMessage, inProgress }: ChatInputProps) => {
    const inputRef = useRef<InputRef>(null);
    const [inputValue, setInputValue] = useState('');

    const handleResourceSelect = (serverId: string, resource: MCPResource) => {
        console.log(`Selected resource: ${resource.name} from server: ${serverId}`);
        onResourceSelect?.(serverId, resource);
    };

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;
        onSendMessage?.(inputValue);
        // Clear the input after sending
        setInputValue('');
    };

    return <Space.Compact style={{ width: '100%', margin: 'auto 0 0 0' }}>
        <Input 
            addonBefore={
                <MCPResourcesDropdown onResourceSelect={handleResourceSelect}>
                    <PlusOutlined />
                </MCPResourcesDropdown>
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSendMessage} 
            size="large" 
            placeholder="Ask anything" 
            style={{ flex: 1 }} 
            ref={inputRef}
            disabled={inProgress}
        />
        <Button size="large" icon={(inProgress) ? <XFilled /> : <ArrowUpOutlined />} onClick={handleSendMessage}></Button>
    </Space.Compact>
}