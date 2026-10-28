import "dotenv/config";
import { Readable } from "node:stream";
import express, { type Request, type Response } from "express";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { createLoginSubmitHandler, createThoughtSpotOAuthProvider } from "./oauth-provider.js";

// Headers that must not be blindly forwarded between hops (either because they
// describe *this* hop's transport, or because we are replacing them ourselves).
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
	"host",
	"connection",
	"authorization",
	"x-ts-host",
	"content-length",
]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
	"connection",
	"content-encoding",
	"transfer-encoding",
]);

function forwardableRequestHeaders(req: Request): HeadersInit {
	const headers: Record<string, string> = {};
	for (const [key, value] of Object.entries(req.headers)) {
		if (HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
		if (typeof value === "string") headers[key] = value;
	}
	return headers;
}

function copyResponseHeaders(upstream: globalThis.Headers, res: Response) {
	upstream.forEach((value, key) => {
		if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) return;
		res.setHeader(key, value);
	});
}

function getBearerToken(authorizationHeader: string | undefined): string | undefined {
	if (!authorizationHeader) return undefined;
	const [scheme, token] = authorizationHeader.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
	return token;
}

// Accepts either a bare host ("my.thoughtspot.cloud") or a full URL and
// normalizes to a full https:// URL, which both the REST API SDK (trusted-auth
// token minting) and the upstream /token/mcp endpoint (Bearer token@host) accept.
function normalizeInstanceUrl(host: string): string {
	return host.startsWith("http://") || host.startsWith("https://")
		? host
		: `https://${host}`;
}

export interface CreateProxyAppOptions {
	tsHost: string;
	tsSecretKey?: string;
	tsAdminUsername?: string;
	tsStaticToken?: string;
	upstreamBaseUrl?: string;
	baseUrl?: string;
}

const DEFAULT_UPSTREAM_BASE_URL = "https://agent.thoughtspot.app";
const DEFAULT_TS_ADMIN_USERNAME = "tsadmin";

export function createProxyApp(options: CreateProxyAppOptions) {
	const {
		tsHost: rawTsHost,
		tsSecretKey,
		tsAdminUsername,
		tsStaticToken,
		upstreamBaseUrl = DEFAULT_UPSTREAM_BASE_URL,
		baseUrl,
	} = options;
	const tsHost = normalizeInstanceUrl(rawTsHost);

	if (!tsStaticToken && !tsSecretKey) {
		throw new Error(
			"Either TS_TOKEN (static-token mode) or TS_SECRET_KEY (trusted-auth mode) must be set.",
		);
	}

	const app = express();
	const oauthEnabled = !tsStaticToken;

	if (oauthEnabled) {
		if (!baseUrl) {
			throw new Error("BASE_URL must be set when using trusted-auth mode (OAuth login).");
		}

		const providerOptions = {
			tsHost,
			tsSecretKey: tsSecretKey!,
			tsAdminUsername: tsAdminUsername ?? DEFAULT_TS_ADMIN_USERNAME,
		};
		const provider = createThoughtSpotOAuthProvider(providerOptions);
		const issuerUrl = new URL(baseUrl);

		app.use(
			mcpAuthRouter({
				provider,
				issuerUrl,
				resourceServerUrl: new URL("/mcp", baseUrl),
			}),
		);

		// The email form (rendered by provider.authorize()) POSTs here — a
		// separate path from /authorize, since that path is owned end-to-end by
		// mcpAuthRouter's own authorizationHandler (mounted above), which expects
		// full OAuth request params (response_type, code_challenge, ...) on every
		// hit, not a plain email field.
		app.post("/login", express.urlencoded({ extended: false }), createLoginSubmitHandler(providerOptions));

		app.use(["/mcp", "/sse"], requireBearerAuth({ verifier: provider }));
	}

	const forward = async (req: Request, res: Response, upstreamPath: string) => {
		let tsAccessToken: string | undefined;

		if (tsStaticToken) {
			// Static-token mode: one shared ThoughtSpot token, no per-user lookup,
			// no OAuth — just a bearer token the caller must already know.
			if (!getBearerToken(req.headers.authorization)) {
				res.status(401).json({ error: "Missing bearer token" });
				return;
			}
			tsAccessToken = tsStaticToken;
		} else {
			// OAuth mode: requireBearerAuth() has already validated the token and
			// attached the ThoughtSpot token minted at login time to req.auth — no
			// re-minting happens here, so this is just a cache read.
			tsAccessToken = (req.auth?.extra as { tsAccessToken?: string } | undefined)?.tsAccessToken;
			if (!tsAccessToken) {
				res.status(401).json({ error: "Unauthorized" });
				return;
			}
		}

		const upstreamUrl = new URL(upstreamPath, upstreamBaseUrl);
		const queryIndex = req.originalUrl.indexOf("?");
		if (queryIndex !== -1) {
			upstreamUrl.search = req.originalUrl.slice(queryIndex);
		}

		const hasBody = !["GET", "HEAD"].includes(req.method);
		const upstreamRes = await fetch(upstreamUrl, {
			method: req.method,
			headers: {
				...forwardableRequestHeaders(req),
				authorization: `Bearer ${tsAccessToken}@${tsHost}`,
			},
			body: hasBody ? (Readable.toWeb(req) as any) : undefined,
			// Required by undici when streaming a request body.
			duplex: hasBody ? "half" : undefined,
		} as RequestInit);

		res.status(upstreamRes.status);
		copyResponseHeaders(upstreamRes.headers, res);

		if (!upstreamRes.body) {
			res.end();
			return;
		}
		Readable.fromWeb(upstreamRes.body as any).pipe(res);
	};

	app.all("/mcp", (req, res) => {
		forward(req, res, "/token/mcp").catch((err) => {
			console.error("Proxy error:", err);
			if (!res.headersSent) res.status(500).json({ error: "Proxy error" });
		});
	});

	app.all("/sse", (req, res) => {
		forward(req, res, "/token/sse").catch((err) => {
			console.error("Proxy error:", err);
			if (!res.headersSent) res.status(500).json({ error: "Proxy error" });
		});
	});

	return app;
}

function main() {
	const tsHost = process.env.TS_HOST;
	if (!tsHost) {
		throw new Error("TS_HOST environment variable is not set");
	}

	const tsSecretKey = process.env.TS_SECRET_KEY;
	const tsAdminUsername = process.env.TS_ADMIN_USERNAME;
	const tsStaticToken = process.env.TS_TOKEN;
	if (tsStaticToken && tsSecretKey) {
		console.warn(
			"Both TS_TOKEN and TS_SECRET_KEY are set — using static-token mode (TS_TOKEN) and ignoring TS_SECRET_KEY.",
		);
	}

	const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
	const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

	const app = createProxyApp({
		tsHost,
		tsSecretKey: tsStaticToken ? undefined : tsSecretKey,
		tsAdminUsername,
		tsStaticToken,
		upstreamBaseUrl: process.env.UPSTREAM_MCP_BASE_URL,
		baseUrl,
	});

	app.listen(port, () => {
		const mode = tsStaticToken ? "static-token" : "trusted-auth (OAuth email login)";
		console.log(`MCP proxy listening on port ${port}`);
		console.log(`Mode: ${mode}`);
		console.log(`Endpoints: http://localhost:${port}/mcp, http://localhost:${port}/sse`);
		if (!tsStaticToken) {
			console.log(`OAuth base URL: ${baseUrl} (set BASE_URL to your public HTTPS URL for real clients)`);
		}
	});
}

main();
