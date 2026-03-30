<!-- search-meta
tags: [typescript-sdk, REST-API, React, TypeScript, liveboard-list, rest-api-sdk]
apis: [ThoughtSpotRestApi, createBearerAuthenticationConfig, searchLiveboards, REST-API-v2]
questions:
  - How do I use the ThoughtSpot REST API SDK in a React application?
  - How do I fetch a list of liveboards using the ThoughtSpot REST API SDK?
  - How do I display ThoughtSpot content in React using the REST API?
  - How do I authenticate with the ThoughtSpot REST API from a React frontend?
-->

# react-rest-api

This example demonstrates how to use the ThoughtSpot REST API SDK to call ThoughtSpot's v2 REST API in a React application.

## Key Usage

```typescript
import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";
import { useEffect, useState } from "react";

const config = createBearerAuthenticationConfig(
  "https://your-instance.thoughtspot.cloud",
  async () => fetchTokenFromYourServer(),
);
const tsClient = new ThoughtSpotRestApi(config);

const LiveboardList = () => {
  const [liveboards, setLiveboards] = useState([]);

  useEffect(() => {
    tsClient.searchLiveboards({}).then(setLiveboards);
  }, []);

  return (
    <ul>
      {liveboards.map((lb) => (
        <li key={lb.id}>{lb.name}</li>
      ))}
    </ul>
  );
};
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/rest-api/typescript-sdk/react-rest-api)

## Documentation

- Links to the Thoughtspot developer docs for the features used in this example.
- [Rest Api Reference](https://developers.thoughtspot.com/docs/rest-apiv2-reference)
- [Rest Api Sdk](https://developers.thoughtspot.com/docs/rest-api-sdk)

## File structure
.
├── api/
│   └── token-server.ts - A simple token server that returns a valid access token for the ThoughtSpot server
└── src/
    ├── App.tsx - The main React component that fetches liveboard lists from ThoughtSpot using the REST API SDK
    ├── thoughtspot-client/
    │   └── thoughtspot-client.ts - A client for the ThoughtSpot REST API SDK
    └── get-auth-token.ts - A utility function for getting a valid access token for the ThoughtSpot

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/typescript-sdk/react-rest-api
```
```
$ npm i
```
```
$ npm run dev
```

### Run token server

```
$ npm run start-token-server
```

### Technology labels

- React
- Typescript
- Web