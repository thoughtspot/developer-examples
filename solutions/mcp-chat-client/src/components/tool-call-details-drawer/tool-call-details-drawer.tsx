import { Drawer, Descriptions, Tag, Typography } from "antd";
import { ToolCallEventData } from "../../../backend/types";

interface ToolCallDetailsDrawerProps {
    visible: boolean;
    onClose: () => void;
    selectedToolCall: ToolCallEventData | null;
    selectedToolCallDetails: any;
}

// Helper function to safely format result data
const formatResult = (result: any): string => {
    if (result === null || result === undefined) {
        return "null";
    }
    
    if (typeof result === "string") {
        // Try to parse as JSON first, if it fails, return as plain text
        try {
            const parsed = JSON.parse(result);
            return JSON.stringify(parsed, null, 2);
        } catch {
            // If it's not valid JSON, return as formatted text
            return result;
        }
    }
    
    if (typeof result === "object") {
        try {
            return JSON.stringify(result, null, 2);
        } catch {
            // If JSON.stringify fails, try to convert to string
            return String(result);
        }
    }
    
    // For primitive types, return as string
    return String(result);
};

export const ToolCallDetailsDrawer = ({
    visible,
    onClose,
    selectedToolCall,
    selectedToolCallDetails
}: ToolCallDetailsDrawerProps) => {
    return (
        <Drawer
            title="Tool Call Details"
            placement="right"
            width={600}
            open={visible}
            onClose={onClose}
            maskClosable={false}
            mask={false}
            destroyOnClose
        >
            {selectedToolCall && (
                <div>
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Server">
                            <Tag color="blue">{selectedToolCall.server}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Tool Name">
                            <Tag color="green">{selectedToolCall.toolName}</Tag>
                        </Descriptions.Item>
                    </Descriptions>
                    
                    {selectedToolCallDetails && (
                        <div style={{ marginTop: 24 }}>
                            <Typography.Title level={5}>Arguments</Typography.Title>
                            <pre style={{ 
                                background: '#f5f5f5', 
                                padding: 16, 
                                borderRadius: 8,
                                overflow: 'auto',
                                fontSize: 12,
                                color: '#000'
                            }}>
                                {formatResult(selectedToolCallDetails.args)}
                            </pre>
                            <Typography.Title level={5}>Result</Typography.Title>
                            <pre style={{ 
                                background: '#f5f5f5', 
                                padding: 16, 
                                borderRadius: 8,
                                overflow: 'auto',
                                fontSize: 12,
                                color: '#000'
                            }}>
                                {formatResult(selectedToolCallDetails.result)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    );
};
