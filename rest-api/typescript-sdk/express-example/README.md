<!-- search-meta
tags: [typescript-sdk, REST-API, Express, NodeJS, TypeScript, rest-api-sdk]
apis: [ThoughtSpotRestApi, createBearerAuthenticationConfig, searchLiveboards, REST-API-v2]
questions:
  - How do I use the ThoughtSpot REST API TypeScript SDK with Express?
  - How do I set up a Node.js Express server with the ThoughtSpot REST API SDK?
  - How do I authenticate with ThoughtSpot REST API SDK in Node.js?
  - How do I fetch liveboards using the ThoughtSpot TypeScript REST API SDK?
-->

# express-example - Typescript SDK

This example demonstrates how to use the @thoughtspot/rest-api-sdk with Express.js in a TypeScript environment.

## Key Usage

```typescript
import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";
import express from "express";

const config = createBearerAuthenticationConfig(
  "https://your-instance.thoughtspot.cloud",
  async () => "your-bearer-token",
);
const tsClient = new ThoughtSpotRestApi(config);

const app = express();

app.get("/liveboards", async (req, res) => {
  const liveboards = await tsClient.searchLiveboards({});
  res.json(liveboards);
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