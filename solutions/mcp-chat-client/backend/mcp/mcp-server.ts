import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
    ListToolsRequest,
    ListToolsResultSchema,
    ListResourcesRequest,
    ListResourcesResultSchema,
    ReadResourceRequest,
    ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OauthProvider } from "./oauth";
import type { MCPServerMetadata } from "../types";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth";
import { MCPAuthError } from "../util";
import { auth } from "@modelcontextprotocol/sdk/client/auth";

export class MCPServer {
    private client: Client;
    private oauthProvider: OauthProvider;

    constructor(public readonly metadata: MCPServerMetadata, redirectUrl: string, private readonly onConnect?: () => void, private readonly onDisconnect?: () => void, private readonly saveClientInfo?: (clientInfo: OAuthClientInformationFull) => void) {
        this.client = new Client({
            name: this.metadata.name,
            version: '1.0.0',
        }, {
            capabilities: {},
        });
        this.oauthProvider = new OauthProvider(this.metadata, redirectUrl, this.saveClientInfo);
    }

    async connect(onRedirect?: (url: string) => void) {
        this.oauthProvider.onRedirect = onRedirect;
        const transport = new StreamableHTTPClientTransport(new URL(this.metadata.url), {
            authProvider: this.oauthProvider,
        });
        try {
            await this.client.connect(transport);
            this.onConnect?.();
        } catch (error) {
            console.error(error);
            if (error.name === 'InvalidGrantError') {
                await this.oauthProvider.deleteTokens();
                error.message = 'Invalid grant. Please try again.';
            }
            this.onDisconnect?.();
            throw new MCPAuthError(error.message);
        }

        return this.client;
    }

    async finishOAuth(code: string) {
        const transport = new StreamableHTTPClientTransport(new URL(this.metadata.url), {
            authProvider: this.oauthProvider,
        });
        await transport.finishAuth(code);
        this.onConnect?.();
    }

    async disconnect() {
        await this.client.close();
        this.onDisconnect?.();
    }

    async listResources() {
        await this.connect();
        if (!this.client.getServerCapabilities()?.resources) {
            return {
                resources: [],
            };
        }
        const resources = await this.client.listResources();
        return resources;
    }

    async readResource(resourceURI: string) {
        await this.connect();
        const resource = await this.client.readResource({ uri: resourceURI });
        return resource;
    }

    async listTools() {
        await this.connect();
        const tools = await this.client.listTools();
        return tools;
    }
}