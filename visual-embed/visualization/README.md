<!-- search-meta
tags: [LiveboardEmbed, visualization, React, TypeScript, runtimeFilters, vizId]
apis: [LiveboardEmbed, RuntimeFilterOp, EmbedEvent, HostEvent, useEmbedRef, init, AuthType]
questions:
  - How do I embed a single ThoughtSpot visualization in React?
  - How do I embed a specific chart from a ThoughtSpot liveboard?
  - How do I apply runtime filters to an embedded visualization?
  - How do I use vizId with LiveboardEmbed to show one chart?
-->

# visualization-embed

This is a small example of how embed visualization into your application.

## Key Usage

```typescript
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed, RuntimeFilterOp } from "@thoughtspot/visual-embed-sdk";

init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.Basic,
  username: "your-username",
  password: "your-password",
});

// Embed a single visualization with a runtime filter
const embed = new LiveboardEmbed(document.getElementById("ts-embed"), {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: "your-liveboard-id",
  vizId: "your-viz-id",
  runtimeFilters: [
    {
      columnName: "state",
      operator: RuntimeFilterOp.EQ,
      values: ["michigan"],
    },
  ],
});
embed.render();
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/visualization)


## Documentation

- [API Reference](https://developers.thoughtspot.com/docs/embed-a-viz) for embedding visualization.

## Environment

The `.env` file contains values for runing the demo. You can use `.env.sample` to create your own environment file

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/visualization
$ create .env file
```
```
$ npm i
```
```
$ npm run dev
```

## Structure

- `src/pages` Includes codes to embed visalization with multiple options.

## Demo

This example includes demos for below scenarios

- Embedding via LiveboardEmbed Class
- Embedding via LiveboardEmbed React component

### Technology labels

- React
- Typescript