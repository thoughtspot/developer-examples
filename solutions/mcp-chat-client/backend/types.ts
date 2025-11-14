import { OAuthClientInformation, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth";

export interface MCPServerMetadata {
    id: string;
    name: string;
    url: string;
    isConnected: boolean;
    logoUrl?: string;
    oauthClientInfo?: OAuthClientInformation;
    allowedTools?: string[];
}

export interface MCPServerMetadataWithToken extends MCPServerMetadata {
    authorizationToken: string;
}

export type Attachment = {
    mimeType: string;
    image_url?: string;
    text?: string;
    filename?: string;
    file_data?: string;
}

export type OauthTokensWithExpiresAt = OAuthTokens & { expires_at?: number };

export enum ResponseEventType {
    START = 'start',
    REASONING = 'reasoning',
    TOOL_CALL = 'tool_call',
    TOOL_CALL_ARGUMENTS = 'tool_call_arguments',
    TOOL_CALL_RESULT = 'tool_call_result',
    OUTPUT_TEXT = 'output_text',
    OUTPUT_TEXT_DELTA = 'output_text_delta',
    OUTPUT_ANNOTATION = 'output_annotation',
    DONE = 'done',
}

export interface StartEventData {
    responseId: string;
}

// Type definitions for each response event data structure
export interface ReasoningEventData {
    text: string;
}

export interface ToolCallEventData {
    server?: string;
    toolName: string;
    itemId: string;
    toolType: "mcp" | string;
}

export interface ToolCallArgumentsEventData {
    itemId: string;
    args: any;
}

export interface ToolCallResultEventData {
    itemId: string;
    result?: any;
}

export interface OutputTextDeltaEventData {
    itemId: string;
    delta: string;
}

export interface OutputAnnotationEventData {
    itemId: string;
    annotations: any[];
}

export interface OutputTextEventData {
    itemId: string;
}


export interface DoneEventData {
    responseId: string;
}

// Discriminated union type for ResponseEvent
export type ResponseEvent =
    | { type: ResponseEventType.START; data: StartEventData }
    | { type: ResponseEventType.REASONING; data: ReasoningEventData }
    | { type: ResponseEventType.TOOL_CALL; data: ToolCallEventData }
    | { type: ResponseEventType.TOOL_CALL_ARGUMENTS; data: ToolCallArgumentsEventData }
    | { type: ResponseEventType.TOOL_CALL_RESULT; data: ToolCallResultEventData }
    | { type: ResponseEventType.OUTPUT_TEXT; data: OutputTextEventData }
    | { type: ResponseEventType.OUTPUT_TEXT_DELTA; data: OutputTextDeltaEventData }
    | { type: ResponseEventType.OUTPUT_ANNOTATION; data: OutputAnnotationEventData }
    | { type: ResponseEventType.DONE; data: DoneEventData };

// expected stream pattern with ndjson events:
// begin => prev_response_id, message, attachments, tools
// Output begins here:
// event:reasoning | markdown
// event:tool_call | server, toolname, tool_call_id, type: mcp|toolName
// event:tool_call_arguments | tool_call_id, args
// event:tool_call_result | tool_call_id, result
// event:output_delta | delta
// event:done | response_id

export interface AIProvider {
    getStreamResponse(message: string, attachments: Attachment[], mcpServers: MCPServerMetadataWithToken[], enabledDefaultTools: string[], referenceId?: string): Promise<ReadableStream>;
}