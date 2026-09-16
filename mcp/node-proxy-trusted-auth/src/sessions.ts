import { randomBytes } from "node:crypto";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * All in-memory, single-process, non-persistent — fine for this example but
 * not for a real deployment. Swap for Redis/a database if you need this to
 * survive a restart or run across multiple instances.
 */

// --- Registered OAuth clients (populated via Dynamic Client Registration) ---

const clients = new Map<string, OAuthClientInformationFull>();

export function getClient(clientId: string): OAuthClientInformationFull | undefined {
	return clients.get(clientId);
}

export function saveClient(client: OAuthClientInformationFull): void {
	clients.set(client.client_id, client);
}

// --- In-flight authorization codes (single-use, short TTL) ---

interface AuthorizationCodeData {
	tsUsername: string;
	clientId: string;
	codeChallenge: string;
	redirectUri: string;
	expiresAt: number;
}

const AUTH_CODE_TTL_MS = 60_000;

const authorizationCodes = new Map<string, AuthorizationCodeData>();

export function createAuthorizationCode(
	data: Omit<AuthorizationCodeData, "expiresAt">,
): string {
	const code = randomBytes(32).toString("hex");
	authorizationCodes.set(code, { ...data, expiresAt: Date.now() + AUTH_CODE_TTL_MS });
	return code;
}

// Read-only lookup (does not delete). Used to validate PKCE before the code
// is actually consumed via consumeAuthorizationCode().
export function peekAuthorizationCode(code: string): AuthorizationCodeData | undefined {
	const data = authorizationCodes.get(code);
	if (!data || data.expiresAt < Date.now()) return undefined;
	return data;
}

// Authorization codes are single-use: this deletes the entry as it reads it.
export function consumeAuthorizationCode(code: string): AuthorizationCodeData | undefined {
	const data = authorizationCodes.get(code);
	if (!data) return undefined;
	authorizationCodes.delete(code);
	if (data.expiresAt < Date.now()) return undefined;
	return data;
}

// --- Access tokens (opaque, mapped to a ThoughtSpot username) ---
//
// The ThoughtSpot token itself is minted once per issuance (initial login, or
// a later refresh) and cached here — NOT re-minted on every /mcp or /sse
// call. Its validity is requested to match ACCESS_TOKEN_TTL_SEC (see
// trusted-auth.ts's validityTimeInSec param), so it stays usable for the
// proxy session's whole lifetime instead of expiring after ThoughtSpot's
// default (~5 min).
//
// Every access token is paired 1:1 with a refresh token at issuance (see
// createSessionTokens below) so a refresh always knows, from server-side
// storage alone, exactly which ThoughtSpot username and client it belongs to
// — the caller never gets to supply or influence that binding.

interface AccessTokenData {
	tsUsername: string;
	tsAccessToken: string;
	clientId: string;
	expiresAt: number;
}

interface RefreshTokenData {
	tsUsername: string;
	clientId: string;
}

export const ACCESS_TOKEN_TTL_SEC = 24 * 60 * 60;

const accessTokens = new Map<string, AccessTokenData>();
const refreshTokens = new Map<string, RefreshTokenData>();

/**
 * Issues a fresh (access token, refresh token) pair bound to the given
 * ThoughtSpot username and OAuth client. Used both at initial login
 * (exchangeAuthorizationCode) and on every refresh (exchangeRefreshToken) —
 * refreshing always re-derives the username from server-side storage, never
 * from anything the caller passes in.
 */
export function createSessionTokens(
	tsUsername: string,
	tsAccessToken: string,
	clientId: string,
): {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
} {
	const accessToken = randomBytes(32).toString("hex");
	const refreshToken = randomBytes(32).toString("hex");
	const expiresIn = ACCESS_TOKEN_TTL_SEC;
	accessTokens.set(accessToken, {
		tsUsername,
		tsAccessToken,
		clientId,
		expiresAt: Date.now() + expiresIn * 1000,
	});
	refreshTokens.set(refreshToken, { tsUsername, clientId });
	return { accessToken, refreshToken, expiresIn };
}

export function getAccessTokenData(token: string): AccessTokenData | undefined {
	const data = accessTokens.get(token);
	if (!data) return undefined;
	if (data.expiresAt < Date.now()) {
		accessTokens.delete(token);
		return undefined;
	}
	return data;
}

// Refresh tokens are single-use (rotated on every refresh, standard OAuth
// practice): this deletes the entry as it reads it, so a stolen-and-replayed
// refresh token stops working the moment the legitimate client refreshes.
export function consumeRefreshToken(token: string): RefreshTokenData | undefined {
	const data = refreshTokens.get(token);
	if (!data) return undefined;
	refreshTokens.delete(token);
	return data;
}
