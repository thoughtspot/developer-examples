<!-- search-meta
tags: [MCP, TypeScript, NodeJS, trusted-auth, white-label, reverse-proxy, OAuth, ThoughtSpot-MCP]
apis: [ThoughtSpotMCPServer, trustedAuth, RestApiSdk, ModelContextProtocolSdk]
questions:
  - How do I white-label the ThoughtSpot MCP server so my users never see ThoughtSpot?
  - How do I front the ThoughtSpot MCP server with my own auth?
  - How do I mint a ThoughtSpot token per user using trusted auth / a secret key?
  - How do I run an MCP proxy in front of ThoughtSpot?
  - How do I let users sign in to an MCP server with just their email, from claude.ai?
-->

# White-Label MCP Proxy (Trusted Auth)

A small, self-hosted reverse proxy that sits in front of ThoughtSpot's MCP server so your users never see "ThoughtSpot" — no `agent.thoughtspot.app` URL, no ThoughtSpot OAuth/SAML login page. Users sign in with just their email address on a page the proxy itself serves; the proxy resolves that email to a ThoughtSpot username and exchanges it for a ThoughtSpot session behind the scenes using [Trusted Authentication](https://developers.thoughtspot.com/docs/trusted-auth-secret-key) (a secret key configured once by a ThoughtSpot admin).

The proxy does not reimplement any ThoughtSpot MCP tools. It forwards requests as-is to ThoughtSpot's hosted `/token/mcp` and `/token/sse` endpoints, rewriting only the `Authorization` header along the way.

Because the login is a real OAuth 2.1 authorization flow (built on the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) auth toolkit), it works natively from **claude.ai's connector UI** and Claude Desktop — no manual token pasting, no `mcp-remote` bridge required.

## How it works

```
MCP client               Your proxy                                    ThoughtSpot
-----------              ----------                                     -----------
"Add connector"  ----->  GET /authorize
                         renders an email-only login page
                         (fully customizable, see below)

user submits email ----> POST /login
                         1. Look up ThoughtSpot     ---->  POST /api/rest/2.0/auth/token/full
                            username for that email          { username: <admin>, secret_key }
                                                      <----   { token }              (admin lookup)
                         2. searchUsers({ email })   ---->  GET /api/rest/2.0/users/search
                                                      <----  [{ name: <username>, ... }]
                         3. issues an authorization
                            code, redirects back to
                            the MCP client

MCP client       <-----  redirect with ?code=...

MCP client       ----->  POST /token
                         exchanges code for a proxy-issued access token

MCP client       ----->  POST /mcp                (Authorization: Bearer <proxy access token>)
                         4. mint a ThoughtSpot     ---->  POST /api/rest/2.0/auth/token/full
                            token for the resolved         { username, secret_key }
                            username via trusted auth <--- { token }
                         5. forward the request     ---->  POST /token/mcp
                            Authorization:                   Authorization: Bearer <token>@<host>
                            Bearer <token>@<host>
                         <-----------------------------  streamed MCP response
<-----------------------(piped straight back)
```

Two modes, chosen by which env vars you set:

- **Trusted-auth mode** (`TS_SECRET_KEY` + `TS_HOST` + `BASE_URL`, optionally `TS_ADMIN_USERNAME`): the real OAuth + email-login flow described above. This is the mode that hides ThoughtSpot end-to-end, works from claude.ai directly, and supports multiple users.
- **Static-token mode** (`TS_TOKEN`): forwards every call using one fixed ThoughtSpot bearer token, with no OAuth and no per-user login — the proxy just checks that *some* bearer token is present. Simpler, single-tenant, useful for quick local testing or `mcp-remote`-style manual setups. If both `TS_TOKEN` and `TS_SECRET_KEY` are set, `TS_TOKEN` wins and a warning is logged.

## Demo

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/mcp/node-proxy-trusted-auth)

## Documentation

- [Trusted Authentication (secret key)](https://developers.thoughtspot.com/docs/trusted-auth-secret-key)
- [ThoughtSpot MCP Server](https://github.com/thoughtspot/mcp-server) — the hosted server this proxy forwards to
- [Model Context Protocol](https://modelcontextprotocol.io/) / [MCP authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization)

## Setup

Clone the developer examples repo.
```bash
git clone https://github.com/thoughtspot/developer-examples
cd developer-examples/mcp/node-proxy-trusted-auth
```

Install dependencies.
```bash
npm i
```

Copy the environment template and fill in your values.
```bash
cp env.template .env
```

```env
TS_HOST=your-instance.thoughtspot.cloud
TS_SECRET_KEY=your_thoughtspot_secret_key
BASE_URL=https://your-public-url.example.com

PORT=3000
```

**Getting `TS_SECRET_KEY`**: in ThoughtSpot, go to **Develop > Customizations > Security Settings** and enable Trusted Authentication to generate a secret key. Requires admin privileges.

**`TS_ADMIN_USERNAME`** (optional, defaults to `tsadmin`): a ThoughtSpot username the proxy uses only to call the Users API and look up other users by email, before anyone has signed in. It doesn't need to be a real ThoughtSpot admin — just a username with rights to search users. Set it explicitly if your instance's service/admin account isn't named `tsadmin`.

**`BASE_URL`**: OAuth requires a real, reachable HTTPS origin for its redirect flow — plain `http://localhost:3000` will not work with claude.ai. During local testing, tunnel your local server (e.g. `ngrok http 3000`) and set `BASE_URL` to the tunnel's HTTPS URL; in production, set it to your real deployed domain.

Run it.
```bash
npm run dev
```

## Usage

### With claude.ai

In claude.ai, go to **Settings → Connectors → Add custom connector** and enter your proxy's URL with the `/mcp` path, e.g. `https://your-public-url.example.com/mcp`. claude.ai will discover the OAuth metadata automatically, redirect the user to the email-login page hosted by your proxy, and complete the connection once they submit a valid email — no token to copy or paste anywhere.

### With curl (for testing the raw flow)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer <access token from completing the OAuth flow>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0.0"}}}'
```

The client only ever talks to your proxy's own URL — it never sees your real `TS_HOST`, `TS_SECRET_KEY`, or a ThoughtSpot-minted token.

Available endpoints:
- `GET /authorize`, `POST /token`, `POST /register` — standard OAuth 2.1 endpoints (installed by `mcpAuthRouter`), plus the corresponding `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` metadata routes.
- `POST /login` — receives the email-form submission and completes the authorization-code redirect back to the MCP client. Not part of the OAuth spec itself — internal to this proxy's login page.
- `POST /mcp` — HTTP Streaming MCP endpoint (mirrors ThoughtSpot's `/token/mcp`)
- `GET /sse` — Server-Sent Events MCP endpoint (mirrors ThoughtSpot's `/token/sse`)

## Customizing the login page

Everything about how the email-entry page looks and reads lives in **`src/login-page.ts`** — it's the one file meant to be edited per customer/deployment. It exports two pure HTML-rendering functions (`renderLoginForm`, `renderLoginError`) with no OAuth logic in them at all; the rest of the flow (`src/oauth-provider.ts`) only calls them and never inlines markup itself. Replace the styling, logo, copy, or layout freely — the only contract to preserve is:
- the `<form>` posts to the `action` passed in, with `method="POST"`
- it has an `<input name="email">`
- it re-emits each entry in the `hidden` map as a matching `<input type="hidden">`, unchanged

## Customizing identity lookup and token minting

Two other functions are meant to be overridden for a real deployment:

- **`findTsUsernameByEmail`** (`src/user-lookup.ts`) — resolves the email submitted on the login page to a ThoughtSpot username. The default implementation calls ThoughtSpot's `searchUsers` API directly. Replace this if you need a different lookup — e.g. matching against your own customer database, a different identity field, or additional validation — before falling back to (or instead of) ThoughtSpot's Users API.
- **`getAccessTokenForUser`** (`src/trusted-auth.ts`) — mints the actual ThoughtSpot access token for a resolved username via secret-key trusted auth. Replace this if you need a different token-issuance mechanism (e.g. a different auth API, additional claims/scopes, or custom validity handling) while keeping the rest of the OAuth flow (`src/oauth-provider.ts`) unchanged — it only calls this function and doesn't care how the token was actually obtained.

Both are called from `src/oauth-provider.ts` (at login and on refresh) and `src/user-lookup.ts` respectively — neither contains any OAuth protocol logic itself, so they're safe to swap out independently of the rest of the flow.

## Known limitations

- Tool names and descriptions come from ThoughtSpot's MCP server as-is and are not rewritten by the proxy. Fully white-labeling tool text would require rewriting JSON-RPC response bodies, which this example does not do.
- OAuth clients, authorization codes, access tokens, and refresh tokens are stored in an in-memory `Map` (`src/sessions.ts`) — single-process and lost on restart. A real deployment should back this with a database or cache shared across instances.
- The ThoughtSpot token for the signed-in user is minted once at login (`exchangeAuthorizationCode`) — or again on refresh (`exchangeRefreshToken`) — with a validity matching the proxy's own 24h access-token TTL, and cached in `src/sessions.ts`. It is not re-minted on every `/mcp`/`/sse` call.
- Refresh tokens are single-use and rotated on every refresh: each refresh returns a new refresh token, and the old one stops working immediately. A refresh always re-derives the ThoughtSpot username strictly from server-side storage bound to that exact refresh token (never from anything the caller supplies), so refreshing can never hand back a different user's session — see `exchangeRefreshToken` in `src/oauth-provider.ts`.
- Email lookup assumes exactly one ThoughtSpot user per email address (uses the first match from `searchUsers`).
- `auto_create` is disabled when minting trusted-auth tokens — the ThoughtSpot username must already exist on your instance.
- The admin token used for email lookups (`TS_ADMIN_USERNAME`) is minted fresh on every login rather than cached; fine for a demo, worth caching until near-expiry in production.

### Technology labels

- TypeScript
- Node.js
- Express
- OAuth 2.1
