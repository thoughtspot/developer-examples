<!-- search-meta
tags: [LiveboardEmbed, liveboard, React, TypeScript, runtimeFilters, EmbedEvent, HostEvent, visibleActions, hiddenActions, Action]
apis: [LiveboardEmbed, EmbedEvent, HostEvent, RuntimeFilterOp, useEmbedRef, init, AuthType, Action, visibleActions, hiddenActions, disabledActions]
questions:
  - How do I embed a ThoughtSpot liveboard in React?
  - How do I listen to liveboard embed events like load and error?
  - How do I trigger host events on an embedded liveboard?
  - How do I embed a liveboard with full height in React?
  - How do I use LiveboardEmbed with tabs?
  - How do I hide or show specific actions in a LiveboardEmbed?
  - How do I use visibleActions or hiddenActions to control the embed toolbar?
  - How do I disable specific menu actions in an embedded liveboard?
-->

# liveboard-embed

This is a small example of how embed liveboard into your application.

## Key Usage

```typescript
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.Basic,
  username: "your-username",
  password: "your-password",
});

// Embed a liveboard
const embed = new LiveboardEmbed(document.getElementById("ts-embed"), {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: "your-liveboard-id",

  // Show only specific actions in the toolbar
  visibleActions: [Action.DownloadAsPdf, Action.Share, Action.DrillDown],

  // Or hide specific actions instead
  // hiddenActions: [Action.Edit, Action.Delete],

  // Disable actions without hiding them
  // disabledActions: [Action.Edit],
});

// Listen to lifecycle events
embed.on(EmbedEvent.Load, () => console.log("Liveboard loaded"));
embed.on(EmbedEvent.Error, (e) => console.error("Error", e));

embed.render();
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/liveboard)


## Documentation

- [API Reference](https://developers.thoughtspot.com/docs/embed-liveboard) for embedding liveboard.

## Environment

The `.env` file contains values for runing the demo.

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/liveboard
$ create .env file using .env.sample
```
```
$ npm i
```
```
$ npm run dev
```

## Structure

- `src/pages` Includes codes to embed liveboard with multiple options.

## Demo

This example includes demos for below scenarios

- Basic Embedding
- Embedding with Full Height
- Embedding liveboard with multiple tabs
- Embedding using React component

### Technology labels

- React
- Typescript