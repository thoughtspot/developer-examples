import { Card, Flex, message, Button, Spin } from "antd"
import { ChatInput } from "../chat-input/chat-input"
import type { MCPResource } from "../../hooks"
import { readMCPServerResource } from "../../services/mcp"
import { useState } from "react";
import { SelectedResources } from "../selected-resources/selected-resources";
import { ConversationResponseState, sendMessage } from "../../services/conversations";
import { abortRequest } from "../../services/api-call";
import { v7 as uuid } from 'uuid';
import { ConversationResponseMessage } from "../conversation-response-message/conversation-response-message";
import { TypingIndicator } from "../typing-indicator/typing-indicator";
import { useSmartScroll } from "../../hooks/use-smart-scroll";
import { DownOutlined } from "@ant-design/icons";
import { useMCPContext } from "../../contexts/mcp-context";
import { ToolCallEventData } from "../../../backend/types";

interface Message {
    role: 'user' | 'assistant';
    content: string | ConversationResponseState;
    id?: string;
}

interface ChatState {
    messages: Message[];
    selectedResources: MCPResource[];
    referenceId?: string;
}

export const Chat = ({ style }: { style?: React.CSSProperties }) => {
    const { mcpServers, enabledDefaultTools } = useMCPContext();
    const [chatState, setChatState] = useState<ChatState>({
        messages: [],
        selectedResources: [],
    });
    const [pendingResources, setPendingResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReadResourceLoading, setIsReadResourceLoading] = useState(false);
    
    // Use the smart scroll hook
    const { containerRef, handleScroll, shouldAutoScroll, scrollToBottom } = useSmartScroll({
        dependencies: [chatState.messages]
    });

    const handleResourceSelect = async (serverId: string, resource: MCPResource) => {
        message.success(`Selected resource: ${resource.name || resource.uri} from ${serverId}`);
        // read the resource
        setIsReadResourceLoading(true);
        const resourceData = await readMCPServerResource(serverId, resource.uri);
        setPendingResources([
            ...pendingResources, 
            ...resourceData
        ]);
        setChatState({
            ...chatState,
            selectedResources: [...chatState.selectedResources, {
                ...resource,
                content: resourceData,
            }],
        });
        setIsReadResourceLoading(false);
    };

    const handleRemoveResource = (resource: MCPResource) => {
        setChatState({
            ...chatState,
            selectedResources: chatState.selectedResources.filter(r => r.uri !== resource.uri),
        });
        setPendingResources(pendingResources.filter(r => r.uri !== resource.uri));
    };

    const handleSendMessage = async (text: string) => {
        if (loading) {
            abortRequest('sendMessage');
        }
        setLoading(true);
        setChatState({
            ...chatState,
            messages: [
                ...chatState.messages, 
                { role: 'user', content: text, id: uuid() }
            ],
        });
        try {
            // filter out the servers that are not connected
            const availableMcpServers = mcpServers
                .filter(server => server.isConnected)

            await sendMessage(text, pendingResources, availableMcpServers, enabledDefaultTools, chatState.referenceId, (state: ConversationResponseState, isStart: boolean) => {
                if (isStart) {
                    setChatState(prevState => ({
                        ...prevState,
                        messages: [
                            ...prevState.messages, 
                            { role: 'assistant', content: state, id: state.responseId },
                        ],
                        referenceId: state.responseId,
                    }));
                } else {
                    // update message content with the new state with the same id
                    setChatState(prevState => ({
                        ...prevState,
                        messages: prevState.messages.map(m => m.id === state.responseId ? { ...m, content: state } : m),
                    }));
                }
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return <Flex vertical className="chat-container" gap={12} style={{ ...style }}>
        <Flex 
            ref={containerRef}
            className="chat-messages" 
            vertical 
            gap={24} 
            style={{ flex: 1, height: '100%', overflow: 'auto', scrollBehavior: 'smooth' }}
            onScroll={handleScroll}
        >
                <Flex className="chat-messages-content" vertical gap={36} style={{ flex: "1 1 auto", minWidth: 600, maxWidth: 800, }}>
                    {chatState.messages.map((message) => (
                        message.role === 'user' 
                            ? <Card
                                size="small"
                                variant="borderless"
                                key={message.id}
                                style={{ whiteSpace: 'pre-wrap', textAlign: 'right', width: 'fit-content', alignSelf: 'flex-end' }}
                            >{message.content as string}</Card> 
                            : <ConversationResponseMessage 
                                key={message.id}
                                state={message.content as ConversationResponseState}
                            />
                    ))}
                    
                    {/* Show typing indicator when waiting for response */}
                    {loading && chatState.messages.length > 0 && (
                        <TypingIndicator />
                    )}
                </Flex>
        </Flex>
        
        {/* Floating scroll-to-bottom button */}
        
        
        <Flex vertical className="chat-input-container" gap={12} style={{ maxWidth: 800 }}>
            {!shouldAutoScroll && (
                <Button
                    shape="circle"
                    type="primary"
                    icon={<DownOutlined />}
                    onClick={scrollToBottom}
                    style={{
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        alignSelf: 'center',
                        margin: 12
                    }}
                    title="Scroll to bottom"
                />
                )}
                <Spin spinning={isReadResourceLoading}>
                   <SelectedResources resources={chatState.selectedResources} onRemoveResource={handleRemoveResource} />
                </Spin>
            <ChatInput onResourceSelect={handleResourceSelect} onSendMessage={handleSendMessage} inProgress={loading} />
        </Flex>
    </Flex>
};
