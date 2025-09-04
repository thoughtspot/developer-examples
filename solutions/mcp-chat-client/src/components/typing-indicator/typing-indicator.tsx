import { Flex, Typography } from "antd";
import "./typing-indicator.scss";

export const TypingIndicator = () => {
    return (
        <Flex align="center" gap={8} className="typing-indicator">
            <Flex gap={4} className="typing-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
            </Flex>
        </Flex>
    );
};
