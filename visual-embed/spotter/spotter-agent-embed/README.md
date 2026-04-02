<!-- search-meta
tags: [spotter-agent, BodylessConversation, Gemini, AI-agent, React, TypeScript, programmatic-spotter]
apis: [BodylessConversation, sendMessage, init, AuthType, TrustedAuthTokenCookieless]
questions:
  - How do I use BodylessConversation API in ThoughtSpot embed?
  - How do I build a custom AI agent that uses ThoughtSpot Spotter programmatically?
  - How do I send a message to ThoughtSpot Spotter and get a visualization back?
  - How do I integrate ThoughtSpot data analysis into a Gemini AI agent?
-->

# spotter-agent-embed

This is a small example of how embed spotter into your own agent if you have one. The example creates a simple agent using Gemini-flash model's function calling capability.

The simple agent makes the decision whether a user's message has analytical intent and should be handled by ThoughtSpot. The decision is passed down to the client which makes
the actual API call to run the query on ThoughtSpot and return the ThoughtSpot visual using the ThoughtSpot Visual embed SDK.

## Key Usage

```typescript
import { BodylessConversation, init, AuthType } from "@thoughtspot/visual-embed-sdk";

init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: async () => {
    const response = await fetch("/api/thoughtspot-token");
    return response.text();
  },
});

const conversation = new BodylessConversation({
  worksheetId: "your-datasource-id",
});

// Send a message and get a rendered visualization back
const response = await conversation.sendMessage("revenue by region");
// response.container is a DOM element with the chart rendered inside it
document.getElementById("chart-area").replaceChildren(response.container);
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/spotter/spotter-agent-embed)

## Documentation

- [API Reference](https://developers.thoughtspot.com/docs/Class_BodylessConversation) for the Spotter Agent Embed.
- Full [tutorial](https://developers.thoughtspot.com/docs/tutorials/spotter/integrate-into-chatbot) on how to embed in your own chatbot.

## Environment

The `.env` file contains some default values. Change the value of `VITE_THOUGHTSPOT_HOST` and `VITE_TS_DATASOURCE_ID` to use on your own instance.

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/spotter/spotter-agent-embed
```
```
$ npm i
```
```
$ npm start
```

## Structure

- `api/simple-agent.ts` A simple agent node service, using Gemini. This would be your own agent.
- `src/` React code for a chatbot using [Antd Pro chat](https://pro-chat.antdigital.dev/en-US/components/pro-chat#programming-operation-control)


### Technology labels

- React
- Typescript
- Web