import { ConversationResponseState } from "../../services/conversations";
import { Flex, Timeline, Typography } from "antd";
import { OutputTextEventData, ResponseEventType, ToolCallEventData } from "../../../backend/types";
import { useMCPContext } from "../../contexts/mcp-context";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { ToolCallDetailsDrawer } from "../tool-call-details-drawer";
import "./conversation-response-message.scss";

interface ConversationResponseMessageProps {
    state: ConversationResponseState;
}

export const ConversationResponseMessage = ({ state }: ConversationResponseMessageProps) => {
    const { mcpServers } = useMCPContext();
    const [selectedToolCall, setSelectedToolCall] = useState<ToolCallEventData | null>(null);
    const [selectedToolCallDetails, setSelectedToolCallDetails] = useState<any>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    
    // Helper to group contiguous TOOL_CALL items
    const groupedItems: Array<
        | { type: "TOOL_CALL_GROUP"; items: ToolCallEventData[] }
        | { type: "OUTPUT_TEXT"; item: OutputTextEventData }
    > = [];

    let i = 0;
    while (i < state.items.length) {
        const item = state.items[i];
        if (item.type === ResponseEventType.TOOL_CALL) {
            // Start a group of contiguous TOOL_CALLs
            const group = [];
            while (
                i < state.items.length &&
                state.items[i].type === ResponseEventType.TOOL_CALL
            ) {
                group.push(state.items[i].data);
                i++;
            }
            groupedItems.push({ type: "TOOL_CALL_GROUP", items: group });
        } else if (item.type === ResponseEventType.OUTPUT_TEXT) {
            groupedItems.push({ type: "OUTPUT_TEXT", item: item.data });
            i++;
        } else {
            // Ignore other types
            i++;
        }
    }

    const handleToolCallClick = (toolCall: ToolCallEventData) => {
        setSelectedToolCall(toolCall);
        setDrawerVisible(true);
        setSelectedToolCallDetails(state.toolCalls[toolCall.itemId]);
    };

    const handleDrawerClose = () => {
        setDrawerVisible(false);
        setSelectedToolCall(null);
    };

    return (
        <>
            <Flex vertical gap={12}>
                {groupedItems.map((group, idx) => {
                    if (group.type === "TOOL_CALL_GROUP") {
                        return (
                            <Timeline key={`toolcall-group-${idx}`}>
                                {group.items.map((toolCallItem: ToolCallEventData) => {
                                    // Find the server by name to get the logo URL
                                    const server = mcpServers.find(s => s.name === toolCallItem.server);
                                    const serverLogoUrl = server?.logoUrl;
                                    
                                    return (
                                        <Timeline.Item 
                                        color="gray" 
                                        key={toolCallItem.itemId}
                                        dot={serverLogoUrl ? (
                                            <img 
                                                src={serverLogoUrl} 
                                                alt={toolCallItem.server}
                                                style={{ 
                                                    width: 24, 
                                                    height: 24, 
                                                    objectFit: 'cover'
                                                }} 
                                            />
                                        ) : undefined}
                                        >
                                            {/* Replace with your actual ToolCallMessage rendering */}
                                            <Flex 
                                                className="tool-call" 
                                                onClick={() => handleToolCallClick(toolCallItem)}
                                            >
                                                <Typography.Text type="secondary">{toolCallItem.server}: {toolCallItem.toolName}</Typography.Text>
                                            </Flex>
                                        </Timeline.Item>
                                    );
                                })}
                            </Timeline>
                        );
                    } else if (group.type === "OUTPUT_TEXT") {
                        const item = group.item;
                        return (
                            <div key={item.itemId} className="markdown-content">
                                <ReactMarkdown>{state.outputs[item.itemId]?.text || ''}</ReactMarkdown>
                            </div>
                        );
                    }
                    return null;
                })}
            </Flex>

            {/* Tool Call Details Drawer */}
            <ToolCallDetailsDrawer
                visible={drawerVisible}
                onClose={handleDrawerClose}
                selectedToolCall={selectedToolCall}
                selectedToolCallDetails={selectedToolCallDetails}
            />
        </>
    );
};