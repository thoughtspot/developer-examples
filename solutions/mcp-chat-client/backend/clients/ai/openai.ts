import { AzureOpenAI } from "openai";
import { AIProvider, Attachment, MCPServerMetadataWithToken, ResponseEvent, ResponseEventType } from "../../types";
import { MCPServer } from "../../mcp/mcp-server";
import { ResponseInput, ResponseInputContent, ResponseOutputText, ResponseStreamEvent, Tool } from "openai/resources/responses/responses";
import { systemPrompt } from "./system-prompt";

const apiKey = process.env.AZURE_OPENAI_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const model = 'gpt-5-mini';
const deployment = 'gpt-5-mini';
const apiVersion = '2025-04-01-preview';

export class OpenAIProvider implements AIProvider {
    public client: AzureOpenAI;

    constructor() {
        this.client = new AzureOpenAI({
            apiKey,
            endpoint,
            apiVersion,
            deployment,
        });
    }

    async getStreamResponse(message: string, attachments: Attachment[], mcpServers: MCPServerMetadataWithToken[], enabledDefaultTools: string[], referenceId?: string): Promise<any> {
        const input: ResponseInput = [{
            role: 'user',
            content: [{
                type: "input_text",
                text: message,
            },
            ...this.getInputContentFromAttachments(attachments)
            ],
        }];

        if (!referenceId) {
            input.unshift({
                role: 'system',
                content: systemPrompt,
            });
        }

        const tools: Tool[] = mcpServers.map(mcp => ({
            type: "mcp",
            server_label: mcp.name,
            server_url: mcp.url,
            require_approval: 'never',
            allowed_tools: mcp.allowedTools,
        }));

        if (enabledDefaultTools.includes("web-search")) {
            tools.push({
                type: "web_search",
            });
        }

        if (enabledDefaultTools.includes("python")) {
            tools.push({
                type: "code_interpreter",
                container: {
                    type: 'auto',
                }
            });
        }

        const responseStream = await this.client.responses.stream({
            model,
            previous_response_id: referenceId,
            input: input,
            tools: mcpServers.map(mcp => ({
                type: "mcp",
                server_label: mcp.name,
                server_url: mcp.url,
                require_approval: 'never',
                allowed_tools: mcp.allowedTools,
                headers: {
                    Authorization: `Bearer ${mcp.authorizationToken}`,
                }
            })),
        });
        const ctx = this;
        return new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    for await (const event of responseStream) {
                        const json = ctx.getKnownEvent(event);
                        if (json) {
                            controller.enqueue(encoder.encode(JSON.stringify(json) + "\n")); // NDJSON
                        }
                    }
                    controller.close();
                } catch (err: any) {
                    controller.enqueue(
                        encoder.encode(JSON.stringify({ type: "error", error: err.message }) + "\n")
                    );
                    controller.close();
                }
            },
        });
    }

    private getInputContentFromAttachments(attachments: Attachment[]): ResponseInputContent[] {
        return attachments.map(attachment => {
            if (attachment.mimeType === 'text/plain') {
                return {
                    type: "input_text",
                    text: attachment.text,
                }
            }
        });
    }

    private getKnownEvent(event: ResponseStreamEvent): ResponseEvent {
        if (event.type === "response.created") {
            return {
                type: ResponseEventType.START,
                data: {
                    responseId: event.response.id,
                }
            }
        }

        if (event.type === "response.output_item.added") {
            if (event.item.type === "mcp_call") {
                return {
                    type: ResponseEventType.TOOL_CALL,
                    data: {
                        server: event.item.server_label,
                        toolName: event.item.name,
                        itemId: event.item.id,
                        toolType: "mcp"
                    }
                }
            }

            if (event.item.type === "web_search_call") {
                return {
                    type: ResponseEventType.TOOL_CALL,
                    data: {
                        toolName: "Web search",
                        itemId: event.item.id,
                        toolType: "web_search"
                    }
                }
            }

            if (event.item.type === "code_interpreter_call") {
                return {
                    type: ResponseEventType.TOOL_CALL,
                    data: {
                        toolName: "Python",
                        itemId: event.item.id,
                        toolType: "python"
                    }
                }
            }

            if (event.item.type === "message") {
                return {
                    type: ResponseEventType.OUTPUT_TEXT,
                    data: {
                        itemId: event.item.id,
                    }
                }
            }
        }

        if (event.type === "response.code_interpreter_call_code.done") {
            return {
                type: ResponseEventType.TOOL_CALL_RESULT,
                data: {
                    itemId: event.item_id,
                    result: event.code,
                }
            }
        }

        if (event.type === "response.web_search_call.completed") {
            return {
                type: ResponseEventType.TOOL_CALL_RESULT,
                data: {
                    itemId: event.item_id,
                    result: "Web search completed"
                }
            }
        }

        if (event.type === "response.mcp_call_arguments.done") {
            return {
                type: ResponseEventType.TOOL_CALL_ARGUMENTS,
                data: {
                    itemId: event.item_id,
                    args: event.arguments
                }
            }
        }

        if (event.type === "response.output_item.done") {
            if (event.item.type === "reasoning") {
                return {
                    type: ResponseEventType.REASONING,
                    data: {
                        text: event.item.summary.map(s => s.text).join("\n")
                    }
                }
            }

            if (event.item.type === "mcp_call") {
                return {
                    type: ResponseEventType.TOOL_CALL_RESULT,
                    data: {
                        itemId: event.item.id,
                        result: event.item.output
                    }
                }
            }
        }

        if (event.type === "response.output_text.delta") {
            return {
                type: ResponseEventType.OUTPUT_TEXT_DELTA,
                data: {
                    itemId: event.item_id,
                    delta: event.delta
                }
            }
        }

        if (event.type === "response.content_part.done") {
            return {
                type: ResponseEventType.OUTPUT_ANNOTATION,
                data: {
                    itemId: event.item_id,
                    annotations: (event.part as ResponseOutputText).annotations
                }
            }
        }

        if (event.type === "response.completed") {
            return {
                type: ResponseEventType.DONE,
                data: {
                    responseId: event.response.id,
                }
            }
        }

        return null;
    }
}
