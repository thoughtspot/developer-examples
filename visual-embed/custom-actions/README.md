<!-- search-meta
tags: [custom-actions, EmbedEvent, LiveboardEmbed, React, TypeScript, context-menu, callback]
apis: [init, AuthType, EmbedEvent, LiveboardEmbed, RuntimeFilterOp, on, CustomAction]
questions:
  - How do I add custom actions to ThoughtSpot embed?
  - How do I handle custom action callbacks in embedded ThoughtSpot?
  - How do I create a custom context menu action in ThoughtSpot?
  - How do I listen for custom action events in ThoughtSpot embed?
  - How do I return JSON data from a custom action in ThoughtSpot?
-->

# Custom Actions

This repository contains multiple examples of using ThoughtSpot [Custom Actions](https://developers.thoughtspot.com/docs/?pageid=customize-actions). A custom action is a type of extension that can be added to ThoughtSpot searches, answers and liveboards to give users additional capabilities. For example, an inventory manager might search ThoughtSpot for items that are low in stock and push a reorder directly from ThoughtSpot to their inventory system.

This is a react.js application.  See the `src/examples` folder for specific examples.

## Key Usage

```typescript
import { init, AuthType, EmbedEvent, LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.Basic,
  username: "your-username",
  password: "your-password",
});

const embed = new LiveboardEmbed(document.getElementById("ts-embed"), {
  liveboardId: "your-liveboard-id",
});

// Listen for custom action callbacks
embed.on(EmbedEvent.CustomAction, (payload) => {
  const { id, data } = payload.data;
  if (id === "show-details") {
    console.log("Custom action triggered with data:", data);
    // Handle your custom action here
  }
});

embed.render();
```

## Demo

Open in [CodeSandbox](https://codesandbox.io/p/sandbox/github/thoughtspot/developer-examples/tree/main/visual-embed/custom-actions)

## Documentation

- [Custom Actions](https://developers.thoughtspot.com/docs/?pageid=customize-actions) on ThoughtSpot Developer Docs.

## Running locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/custom-actions
```
```
$ npm i
```
```
$ npm run dev
```