# react-rest-api

This example demonstrates how to use the ThoughtSpot REST API SDK to call ThoughtSpot's v2 REST API in a React application.

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
