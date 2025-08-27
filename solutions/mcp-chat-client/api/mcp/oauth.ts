import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth"
import type { MCPServerMetadata } from '../types'
import { OAuthClientInformation, OAuthClientInformationFull, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth";
import { redisClient } from '../redis';

export class OauthProvider implements OAuthClientProvider {

    private _clientMetadata: OAuthClientMetadata;
    public onRedirect: (url: string) => void;

    constructor(private readonly mcpServer: MCPServerMetadata,
        private readonly _redirectUrl?: string) {
        //
        this._clientMetadata = {
            redirect_uris: [this._redirectUrl],
            token_endpoint_auth_method: 'client_secret_post',
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            client_name: this.mcpServer.name,
            client_uri: `https://chat.thoughtspot.app`,
        };
    }

    get redirectUrl(): string | URL {
        return this._redirectUrl;
    }

    get clientMetadata(): OAuthClientMetadata {
        return this._clientMetadata;
    }

    async state(): Promise<string> {
        return encodeState(this.mcpServer.id);
    }

    async tokens(): Promise<OAuthTokens> {
        return JSON.parse(await redisClient.get(this.mcpServer.id) as string || '{}');
    }

    async codeVerifier(): Promise<string> {
        return await redisClient.get(this.mcpServer.id + ':codeVerifier') as string;
    }

    clientInformation(): OAuthClientInformation | undefined {
        return this.mcpServer.oauthClientInfo;
    }

    async saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {

    }

    async saveTokens(tokens: OAuthTokens): Promise<void> {
        await redisClient.set(this.mcpServer.id, JSON.stringify(tokens));
    }

    async redirectToAuthorization(): Promise<void> {
        this.onRedirect(this._redirectUrl);
        // redirect to the authorization url
    }

    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        await redisClient.set(this.mcpServer.id + ':codeVerifier', codeVerifier, {
            EX: 60 * 5, // 5 minutes
        });
    }
}

export const decodeState = (state: string) => {
    const decoded = atob(state);
    return JSON.parse(decoded) as { serverId: string };
}

export const encodeState = (serverId: string) => {
    const encoded = btoa(JSON.stringify({ serverId }));
    return encoded;
}