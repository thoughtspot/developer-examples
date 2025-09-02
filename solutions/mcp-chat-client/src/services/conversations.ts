import { Attachment, MCPServerMetadata, ResponseEvent, ResponseEventType } from "../../backend/types";
import { ImmutableObject } from "../util";
import { apiCall, readNDJSONStream } from "./api-call";

export interface ConversationResponseState {
    responseId?: string;
    items: ResponseEvent[];
    toolCalls: Record<string, any>;
    outputs: Record<string, any>;
    reasoning: string;
    done: boolean;
}

export const sendMessage = async (message: string, attachments: Attachment[], mcpServers: MCPServerMetadata[], enabledDefaultTools: string[], referenceId?: string, onUpdate?: (state: any, isStart: boolean) => void) => {
    const stream = await apiCall('/conversations/send', { body: { message, attachments, mcpServers, referenceId, enabledDefaultTools } }, 'sendMessage', true);

    let responseState = ImmutableObject.create<ConversationResponseState>({
        items: [],
        toolCalls: {},
        outputs: {},
        reasoning: '',
        done: false,
    });

    for await (const event of readNDJSONStream(stream) as AsyncGenerator<ResponseEvent>) {
        let isStart = false;
        switch (event.type) {
            case ResponseEventType.START:
                responseState.responseId = event.data.responseId;
                isStart = true;
                break;
            case ResponseEventType.TOOL_CALL:
                responseState.toolCalls[event.data.itemId] = event.data;
                responseState.items.push(event)
                break;
            case ResponseEventType.TOOL_CALL_ARGUMENTS:
                responseState.toolCalls[event.data.itemId].args = event.data.args;
                break;
            case ResponseEventType.TOOL_CALL_RESULT:
                responseState.toolCalls[event.data.itemId].result = event.data.result;
                break;
            case ResponseEventType.OUTPUT_TEXT:
                responseState.outputs[event.data.itemId] = { text: '' };
                responseState.items.push(event)
                break;
            case ResponseEventType.OUTPUT_TEXT_DELTA:
                responseState.outputs[event.data.itemId].text += event.data.delta;
                break;
            case ResponseEventType.OUTPUT_ANNOTATION:
                responseState.outputs[event.data.itemId] = responseState.outputs[event.data.itemId] || { text: '' };
                responseState.outputs[event.data.itemId].annotations = event.data.annotations;
                break;
            case ResponseEventType.REASONING:
                responseState.reasoning = event.data.text;
                break;
            case ResponseEventType.DONE:
                responseState.done = true;
                break;
        }

        if (onUpdate) {
            setTimeout(() => {
                onUpdate({
                    ...responseState
                }, isStart);
            }, 0);
        }
    }
}

