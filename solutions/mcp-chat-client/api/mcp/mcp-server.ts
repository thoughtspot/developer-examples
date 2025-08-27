import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import {
    ListToolsRequest,
    ListToolsResultSchema,
    ListResourcesRequest,
    ListResourcesResultSchema,
    ReadResourceRequest,
    ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types";
import { OauthProvider } from "./oauth";
import type { MCPServerMetadata } from "../types";

export class MCPServer {
    private client: Client;
    private oauthProvider: OauthProvider;

    constructor(public readonly metadata: MCPServerMetadata, private readonly onConnect: () => void, private readonly onDisconnect: () => void) {
        this.client = new Client({
            name: this.metadata.name,
        }, {
            capabilities: {
                listResources: true,
                readResource: true,
                listTools: true,
            },
        });
    }

    async connect(redirectUrl: string, onRedirect: (url: string) => void) {
        this.oauthProvider = new OauthProvider(this.metadata, redirectUrl);
        this.oauthProvider.onRedirect = onRedirect;
        const transport = new StreamableHTTPClientTransport(new URL(this.metadata.url), {
            authProvider: this.oauthProvider,
        });

        await this.client.connect(transport);

        return this.client;
    }

    async finishOAuth(code: string) {
        this.oauthProvider = new OauthProvider(this.metadata);
        const transport = new StreamableHTTPClientTransport(new URL(this.metadata.url), {
            authProvider: this.oauthProvider,
        });
        await transport.finishAuth(code);
        this.onConnect();
    }

    async disconnect() {
        await this.client.close();
        this.onDisconnect();
    }

    async listResources() {
        const resources = await this.client.listResources();
        return resources;
    }

    async readResource(resourceURI: string) {
        const resource = await this.client.readResource({ uri: resourceURI });
        return resource;
    }

    async listTools() {
        const tools = await this.client.listTools();
        return tools;
    }
}