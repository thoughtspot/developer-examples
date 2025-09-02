import { Flex, Switch, Typography } from "antd";
import { useEffect, useState } from "react";
import "./default-tools.scss";
import { useMCPContext } from "../../contexts/mcp-context";

interface DefaultTool {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

export const DefaultTools = () => {
    const { toggleDefaultTool, enabledDefaultTools } = useMCPContext();
    const [defaultTools, setDefaultTools] = useState<DefaultTool[]>([
        {
            id: "web-search",
            name: "Web search",
            description: "Search the web for real-time information",
            enabled: enabledDefaultTools.includes("web-search")
        },
        {
            id: "python",
            name: "Python",
            description: "Execute Python code and run computations",
            enabled: enabledDefaultTools.includes("python")
        }
    ]);

    useEffect(() => {
        setDefaultTools(defaultTools.map(tool => ({
            ...tool,
            enabled: enabledDefaultTools.includes(tool.id)
        })));
    }, [enabledDefaultTools]);

    const handleToggleTool = (toolId: string, enabled: boolean) => {
        toggleDefaultTool(toolId, enabled);
    };

    return (
        <Flex className="default-tools" vertical gap={24} align="flex-start">
            <Typography.Text type="secondary">Default Tools</Typography.Text>
            
            <Flex vertical gap={8} style={{ width: '100%', textAlign: 'left' }}>
                {defaultTools.map((tool) => (
                    <Flex key={tool.id} vertical gap={8}>
                        <Flex align="center" justify="space-between" gap={8}>
                            <Typography.Text>{tool.name}</Typography.Text>
                            <Switch 
                                checked={tool.enabled}
                                size="small" 
                                onChange={(checked) => handleToggleTool(tool.id, checked)}
                            />
                        </Flex>
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                            {tool.description}
                        </Typography.Text>
                    </Flex>
                ))}
            </Flex>
        </Flex>
    );
};