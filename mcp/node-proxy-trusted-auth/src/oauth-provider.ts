import type { Request, Response } from "express";
import type {
	AuthorizationParams,
	OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
	OAuthClientInformationFull,
	OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { InvalidGrantError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { renderLoginError, renderLoginForm } from "./login-page.js";
import { getAccessTokenForUser } from "./trusted-auth.js";
import { findTsUsernameByEmail } from "./user-lookup.js";
import {
	ACCESS_TOKEN_TTL_SEC,
	consumeAuthorizationCode,
	consumeRefreshToken,
	createAuthorizationCode,
	createSessionTokens,
	getAccessTokenData,
	getClient,
	peekAuthorizationCode,
	saveClient,
} from "./sessions.js";

export interface ThoughtSpotOAuthProviderOptions {
	tsHost: string;
	tsSecretKey: string;
	tsAdminUsername: string;
}

/**
 * A minimal OAuth 2.1 authorization server whose "login page" is a single
 * email field instead of a redirect to ThoughtSpot or a third-party IdP. See
 * src/login-page.ts to change how that page looks.
 */
export function createThoughtSpotOAuthProvider(
	options: ThoughtSpotOAuthProviderOptions,
): OAuthServerProvider {
	const { tsHost, tsSecretKey } = options;

	const clientsStore: OAuthRegisteredClientsStore = {
		getClient(clientId: string) {
			return getClient(clientId);
		},
		registerClient(client) {
			// The SDK's registration handler has already generated client_id
			// (and client_secret, if applicable) before calling this.
			const full = client as OAuthClientInformationFull;
			saveClient(full);
			return full;
		},
	};

	return {
		clientsStore,

		async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) {
			const html = renderLoginForm({
				action: "/login",
				hidden: {
					client_id: client.client_id,
					redirect_uri: params.redirectUri,
					state: params.state ?? "",
					code_challenge: params.codeChallenge,
				},
			});
			res.status(200).type("html").send(html);
		},

		async challengeForAuthorizationCode(
			_client: OAuthClientInformationFull,
			authorizationCode: string,
		): Promise<string> {
			const data = peekAuthorizationCode(authorizationCode);
			if (!data) {
				throw new InvalidGrantError("Invalid or expired authorization code");
			}
			return data.codeChallenge;
		},

		async exchangeAuthorizationCode(
			client: OAuthClientInformationFull,
			authorizationCode: string,
		): Promise<OAuthTokens> {
			const data = consumeAuthorizationCode(authorizationCode);
			if (!data) {
				throw new InvalidGrantError("Invalid or expired authorization code");
			}
			if (data.clientId !== client.client_id) {
				throw new InvalidGrantError("Authorization code was not issued to this client");
			}
			// Mint the ThoughtSpot token once here, valid for as long as the proxy's
			// own access token, and cache it — /mcp and /sse reuse this cached token
			// instead of re-minting one from ThoughtSpot on every call.
			const tsAccessToken = await getAccessTokenForUser(
				tsHost,
				data.tsUsername,
				tsSecretKey,
				ACCESS_TOKEN_TTL_SEC,
			);
			const { accessToken, refreshToken, expiresIn } = createSessionTokens(
				data.tsUsername,
				tsAccessToken,
				client.client_id,
			);
			return {
				access_token: accessToken,
				refresh_token: refreshToken,
				token_type: "bearer",
				expires_in: expiresIn,
			};
		},

		async exchangeRefreshToken(
			client: OAuthClientInformationFull,
			refreshToken: string,
		): Promise<OAuthTokens> {
			// The ThoughtSpot username comes ONLY from what this refresh token
			// resolves to in server-side storage — never from anything the caller
			// supplies — so refreshing can never hand back a different user's
			// ThoughtSpot session, no matter what a client requests.
			const data = consumeRefreshToken(refreshToken);
			if (!data) {
				throw new InvalidGrantError("Invalid or expired refresh token");
			}
			if (data.clientId !== client.client_id) {
				throw new InvalidGrantError("Refresh token was not issued to this client");
			}
			const tsAccessToken = await getAccessTokenForUser(
				tsHost,
				data.tsUsername,
				tsSecretKey,
				ACCESS_TOKEN_TTL_SEC,
			);
			const { accessToken, refreshToken: newRefreshToken, expiresIn } = createSessionTokens(
				data.tsUsername,
				tsAccessToken,
				client.client_id,
			);
			return {
				access_token: accessToken,
				refresh_token: newRefreshToken,
				token_type: "bearer",
				expires_in: expiresIn,
			};
		},

		async verifyAccessToken(token: string): Promise<AuthInfo> {
			const data = getAccessTokenData(token);
			if (!data) {
				throw new InvalidTokenError("Invalid or expired access token");
			}
			return {
				token,
				clientId: data.clientId,
				scopes: [],
				expiresAt: Math.floor(data.expiresAt / 1000),
				extra: { tsUsername: data.tsUsername, tsAccessToken: data.tsAccessToken },
			};
		},
	};
}

/**
 * Handles the POST from the email form rendered by `authorize()` above:
 * resolves the email to a ThoughtSpot username, mints an authorization code,
 * and redirects back to the OAuth client's redirect_uri — completing the
 * authorization-code step of the flow.
 */
export function createLoginSubmitHandler(options: ThoughtSpotOAuthProviderOptions) {
	const { tsHost, tsSecretKey, tsAdminUsername } = options;

	return async (req: Request, res: Response) => {
		const { email, client_id, redirect_uri, state, code_challenge } = req.body as Record<
			string,
			string | undefined
		>;

		if (!email || !client_id || !redirect_uri || !code_challenge) {
			res.status(400).type("html").send(renderLoginError("Missing required sign-in information."));
			return;
		}

		let tsUsername: string | undefined;
		try {
			// If required get tsUsername and add here
			tsUsername = await findTsUsernameByEmail(tsHost, email, tsAdminUsername, tsSecretKey);
		} catch (err) {
			console.error("Email lookup failed:", err);
		}

		if (!tsUsername) {
			// Deliberately generic: does not reveal whether the email exists.
			res
				.status(401)
				.type("html")
				.send(renderLoginError("We couldn't sign you in with that email address."));
			return;
		}

		const code = createAuthorizationCode({
			tsUsername,
			clientId: client_id,
			codeChallenge: code_challenge,
			redirectUri: redirect_uri,
		});

		const redirectUrl = new URL(redirect_uri);
		redirectUrl.searchParams.set("code", code);
		if (state) redirectUrl.searchParams.set("state", state);
		res.redirect(302, redirectUrl.toString());
	};
}
