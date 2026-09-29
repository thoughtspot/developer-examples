<!-- search-meta
tags: [reuse-token, cookieless-auth, TrustedAuthTokenCookieless, REST-API-SDK, LiveboardEmbed, React, TypeScript]
apis: [ThoughtSpotRestApi, createBearerAuthenticationConfig, getFullAccessToken, AuthType, LiveboardEmbed, searchMetadata]
questions:
  - How do I share one auth token between the REST API SDK and the Visual Embed SDK?
  - How do I build a liveboard list page with the REST API SDK that opens a Liveboard embed on click?
  - How do I avoid minting a separate token for cookieless embedding and REST API calls?
-->

# Reuse token between REST API SDK & Visual Embed SDK

A Liveboard list page built with the **REST API SDK** (TypeScript). Clicking a liveboard opens it with **`LiveboardEmbed`** using cookieless auth — both use the exact same cached token instead of each fetching their own.

Two equivalent frontends share one token server:

- `api/` — the token server, common to both.
- `vanilla/` — plain TypeScript + Vite, no framework.
- `react/` — the same flow with React.

## Key usage

```ts
// One token-fetcher, shared everywhere.
let cached: Token | null = null;
const getCachedAuthToken = async () => {
  if (cached && cached.expiration_time_in_millis - Date.now() > 30_000) {
    return cached.token;
  }
  const res = await fetch("/api/thoughtspot-token");
  cached = await res.json();
  return cached.token;
};

// REST API SDK client — used for the liveboard list.
const restClient = new ThoughtSpotRestApi(
  createBearerAuthenticationConfig(THOUGHTSPOT_HOST, getCachedAuthToken),
);

// Embed SDK — used for the liveboard view. Same function, same token.
init({
  thoughtSpotHost: THOUGHTSPOT_HOST,
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: getCachedAuthToken,
});
```

## Run it

```bash
cp sample.env .env   # shared by the token server and both frontends
npm install           # installs the token server's deps (api/)

cd vanilla   # or: cd react
npm install
npm run start   # runs the shared token server + the Vite dev server together
```

Open http://localhost:3001 for `vanilla/`, or http://localhost:3000 for `react/`.

`sample.env` ships with a public ThoughtSpot training-instance demo user — fill in `DEMO_USER_PASSWORD`. For your own cluster, set `VITE_THOUGHTSPOT_HOST`, `VITE_DEMO_USER_USERNAME`, and either `DEMO_USER_PASSWORD` or `VITE_THOUGHTSPOT_SECRET_KEY` (recommended for production — see [Trusted authentication](https://developers.thoughtspot.com/docs/trusted-auth-secret-key)).

## Files

- `api/token-server.ts` — Express endpoint (shared by both apps) that mints one bearer token via `getFullAccessToken`.
- `react/src/` / `vanilla/src/` — each has its own:
  - `get-auth-token.ts` — caches that token in memory and re-fetches only once it's near expiry.
  - `thoughtspot-client.ts` — REST API SDK client, authenticated with the cached token.
  - `App.tsx` / `main.ts` — liveboard list (REST API SDK) → click → `LiveboardEmbed` (cookieless, same cached token).

## Documentation

- [Cookieless authentication](https://developers.thoughtspot.com/docs/trusted-auth-sdk#_cookieless_authentication_examples)
- [REST API SDK](https://developers.thoughtspot.com/docs/rest-api-sdk)
