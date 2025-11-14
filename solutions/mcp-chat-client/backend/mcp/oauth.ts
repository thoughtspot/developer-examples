import { auth, OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js"
import type { MCPServerMetadata, OauthTokensWithExpiresAt } from '../types'
import { OAuthClientInformation, OAuthClientInformationFull, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { redisClient } from '../clients/redis';

export class OauthProvider implements OAuthClientProvider {

    private _clientMetadata: OAuthClientMetadata;
    public onRedirect: (url: string) => void;

    constructor(private readonly mcpServer: MCPServerMetadata,
        private readonly _redirectUrl?: string,
        private readonly saveClientInfo?: (clientInfo: OAuthClientInformationFull) => void) {
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

    async tokens(): Promise<OauthTokensWithExpiresAt> {
        return JSON.parse(await redisClient.get(this.mcpServer.id) as string || '{}');
    }

    async deleteTokens(): Promise<void> {
        await redisClient.del(this.mcpServer.id);
    }

    async codeVerifier(): Promise<string> {
        return await redisClient.get(this.mcpServer.id + ':codeVerifier') as string;
    }

    clientInformation(): OAuthClientInformation | undefined {
        return this.mcpServer.oauthClientInfo;
    }

    async saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {
        if (this.saveClientInfo) {
            return this.saveClientInfo(clientInformation);
        }
    }

    async saveTokens(tokens: OauthTokensWithExpiresAt): Promise<void> {
        if (tokens.expires_in) {
            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
            tokens.expires_at = expiresAt.valueOf();
        }
        await redisClient.set(this.mcpServer.id, JSON.stringify(tokens));
    }

    async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
        this.onRedirect(authorizationUrl.href);
    }

    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        await redisClient.set(this.mcpServer.id + ':codeVerifier', codeVerifier, {
            EX: 60 * 5, // 5 minutes
        });
    }

    async refreshAuth() {
        return auth(this, {
            serverUrl: new URL(this.mcpServer.url),
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