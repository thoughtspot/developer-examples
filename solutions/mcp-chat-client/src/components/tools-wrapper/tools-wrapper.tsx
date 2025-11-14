import { Divider, Flex } from "antd";
import { DefaultTools } from "../default-tools/default-tools";
import { MCPList } from "../mcp/mcp-list";
import "./tools-wrapper.scss";

export const ToolsWrapper = () => {
    return (
        <Flex className="tools-wrapper" vertical gap={12} style={{ height: '100%' }}>
            <DefaultTools />
            <Divider />
            <MCPList />
        </Flex>
    );
};
