<!-- search-meta
secondary: true
see: code-based-custom-actions
tags: [UI-created custom actions, admin-configured custom actions, custom action callbacks, EmbedEvent.CustomAction, ShowDetails, JSONReturn, DetailPane, ContentLinking, React, TypeScript]
apis: [init, AuthType, EmbedEvent, LiveboardEmbed, RuntimeFilterOp, on, CustomAction]
questions:
  - How do I handle callbacks for custom actions created in the ThoughtSpot Admin UI?
  - How do I return JSON data from a custom action to my app?
  - How do I build a details pane / content-linking workflow from a custom action callback?
-->

# Custom Actions (UI-created) — callback patterns

> ⚠️ **Adding custom actions?** Prefer **[code-based custom actions](../code-based-custom-actions)** — that is the default, recommended approach and the right starting point for almost every use case. This example is specifically about **handling callbacks for custom actions that were created in the ThoughtSpot Admin UI**, and richer callback workflows (returning JSON, detail panes, content linking).

This repository contains multiple examples of consuming ThoughtSpot [Custom Actions](https://developers.thoughtspot.com/docs/?pageid=customize-actions) that were configured in the ThoughtSpot UI. A custom action is a type of extension that can be added to ThoughtSpot searches, answers and liveboards to give users additional capabilities. For example, an inventory manager might search ThoughtSpot for items that are low in stock and push a reorder directly from ThoughtSpot to their inventory system.

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

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/visual-embed/custom-actions)

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