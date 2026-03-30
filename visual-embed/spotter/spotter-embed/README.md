<!-- search-meta
tags: [ConversationEmbed, SpotterEmbed, Spotter, React, TypeScript, AI-search, conversational-analytics]
apis: [ConversationEmbed, init, AuthType, worksheetId]
questions:
  - How do I embed the ThoughtSpot Spotter AI conversational search experience?
  - How do I use ConversationEmbed in a React project?
  - How do I embed the ThoughtSpot AI analytics chat interface?
  - How do I connect Spotter to a specific data source in the embed?
-->

# Spotter Embed

Embed the ThoughtSpot Spotter experience. You can customize the text, logo, and other styles as per your theme.

## Key Usage

```typescript
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { ConversationEmbed } from "@thoughtspot/visual-embed-sdk/react";

init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.None,
});

// Embed the Spotter conversational AI experience
const SpotterPage = () => (
  <ConversationEmbed
    worksheetId="your-datasource-id"
    frameParams={{ width: "100%", height: "100%" }}
  />
);
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/spotter/spotter-embed)

## Documentation

- [Spotter Embed](https://developers.thoughtspot.com/docs/Class_SpotterEmbed)


## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/spotter/spotter-embed
```
```
$ npm i
```
```
$ npm run dev
```

### Technology labels

- React
- Typescript
- Web