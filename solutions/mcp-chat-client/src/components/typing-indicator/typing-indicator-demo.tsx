import { useState } from "react";
import { Button, Card, Flex } from "antd";
import { TypingIndicator } from "./typing-indicator";

export const TypingIndicatorDemo = () => {
    const [showTyping, setShowTyping] = useState(false);

    const toggleTyping = () => {
        setShowTyping(!showTyping);
    };

    return (
        <Card title="Typing Indicator Demo" style={{ maxWidth: 400, margin: '20px auto' }}>
            <Flex vertical gap={16} align="center">
                <Button onClick={toggleTyping} type="primary">
                    {showTyping ? 'Hide' : 'Show'} Typing Indicator
                </Button>
                
                {showTyping && (
                    <div style={{ width: '100%' }}>
                        <TypingIndicator />
                    </div>
                )}
                
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    This demonstrates the typing indicator that appears when waiting for AI responses.
                    The three dots animate with a bouncing effect to show that the AI is processing.
                </div>
            </Flex>
        </Card>
    );
};
