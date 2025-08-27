import { OAuthClientInformation } from "@modelcontextprotocol/sdk/shared/auth";

export interface MCPServerMetadata {
    id: string;
    name: string;
    url: string;
    isConnected: boolean;
    logoUrl?: string;
    oauthClientInfo?: OAuthClientInformation;
    allowedTools?: string[];
}
