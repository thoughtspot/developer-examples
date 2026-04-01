<!-- search-meta
tags: [typescript-sdk, REST-API, Express, NodeJS, TypeScript, rest-api-sdk]
apis: [ThoughtSpotRestApi, createBearerAuthenticationConfig, getCurrentUserInfo, searchMetadata, REST-API-v2]
questions:
  - How do I use the ThoughtSpot REST API TypeScript SDK with Express?
  - How do I set up a Node.js Express server with the ThoughtSpot REST API SDK?
  - How do I authenticate with ThoughtSpot REST API SDK per user in Node.js?
  - How do I fetch metadata using the ThoughtSpot TypeScript REST API SDK?
-->

# express-example - Typescript SDK

This example demonstrates how to use the @thoughtspot/rest-api-sdk with Express.js in a TypeScript environment. It shows a per-user authentication pattern where each request gets its own authenticated ThoughtSpot client based on the username passed in the request header.

## Key Usage

```typescript
import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";
import express, { RequestHandler } from "express";

// Create a per-user authenticated ThoughtSpot client
const getAuthenticatedClient = (username: string) => {
  const config = createBearerAuthenticationConfig(
    "https://your-instance.thoughtspot.cloud",
    () => getCachedAuthToken(username), // fetch token per user
  );
  return new ThoughtSpotRestApi(config);
};

// Middleware: attach ThoughtSpot client to each request
const addThoughtSpotClient: RequestHandler = async (req, res, next) => {
  const username = req.headers['x-my-username'] as string;
  if (!username) return res.status(401).json({ error: 'Username required' });
  (req as any).thoughtSpotClient = getAuthenticatedClient(username);
  next();
};

const app = express();
app.use(addThoughtSpotClient);

// Get current user info
app.get('/endpoint-1', async (req, res) => {
  const client: ThoughtSpotRestApi = (req as any).thoughtSpotClient;
  const userInfo = await client.getCurrentUserInfo();
  res.json(userInfo);
});

// Search metadata (liveboards and answers)
app.get('/endpoint-2', async (req, res) => {
  const client: ThoughtSpotRestApi = (req as any).thoughtSpotClient;
  const metadata = await client.searchMetadata({
    metadata: [{ type: 'LIVEBOARD' }, { type: 'ANSWER' }],
    record_offset: 0,
    record_size: 50,
  });
  res.json(metadata);
});

app.listen(3000);
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/rest-api/typescript-sdk/express-example)

## Documentation

- [Rest Api Reference](https://developers.thoughtspot.com/docs/rest-apiv2-reference)
- [Rest Api Sdk](https://developers.thoughtspot.com/docs/rest-api-sdk)
- [NPM](https://www.npmjs.com/package/@thoughtspot/rest-api-sdk)

## File Structure
src/
├── handlers/            # Handlers for the different APIs
├── thoughtspot-clients/ # Clients for the different APIs
└── index.ts            # Entry point for the application

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/typescript-sdk/express-example
```
```
$ npm i
```
```
$ npm run start
```

### Technology labels

- Typescript
- NodeJS
- Express