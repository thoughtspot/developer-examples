<!-- search-meta
tags: [preRender, prefetch, AppEmbed, LiveboardEmbed, React, TypeScript, performance, PreRenderedAppEmbed]
apis: [AppEmbed, LiveboardEmbed, PreRenderedAppEmbed, PreRenderedLiveboardEmbed, preRenderId, useInit, AuthType]
questions:
  - How do I use preRender to speed up ThoughtSpot embed load time?
  - How do I prefetch a ThoughtSpot embed before the user navigates to it?
  - How do I pre-render a liveboard embed on demand in React?
  - How can I reduce the time to show an embedded ThoughtSpot component?
  - What is the difference between preRender and normal embed rendering in ThoughtSpot?
  - How do I embed the full ThoughtSpot application using AppEmbed?
  - How do I use AppEmbed to embed the entire ThoughtSpot app in React?
-->

# pre-rendering

This example demonstrates how to embed the full ThoughtSpot application using AppEmbed with pre-rendering strategies in React to improve perceived load time.

The code is structured into three main embed components:

1. Normal Embed - Uses the default ThoughtSpot SDK behavior where the app loads when the component renders
2. Pre-Render Embed - Pre-renders the embed as soon as `<PreRenderedAppEmbed preRenderId="pre-render" />` is rendered
3. Pre-Render On Demand Embed - Only pre-renders after the embed component is rendered at least once

When you open the demo, you'll see:

- A home page with links to each embed type
- Navigation bar at the top to switch between different embed examples
- Live examples showing the loading behavior differences

The app uses React Router for navigation between the different embed examples, allowing you to compare their performance characteristics.

## Key Usage

```typescript
import { useInit, AuthType, AuthStatus } from "@thoughtspot/visual-embed-sdk/react";
import { AppEmbed, LiveboardEmbed, PreRenderedAppEmbed, PreRenderedLiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

// Step 1: Pre-render embeds at app startup (hidden, loads in background)
const EmbedInit = ({ children }) => {
  const authEERef = useInit({
    thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
    authType: AuthType.Basic,
    username: "your-username",
    password: "your-password",
  });

  return (
    <div>
      {/* These render invisibly in the background */}
      <PreRenderedAppEmbed preRenderId="pre-render" />
      <PreRenderedLiveboardEmbed
        liveboardId="your-liveboard-id"
        preRenderId="pre-render-with-liveboard-id"
      />
      {children}
    </div>
  );
};

// Step 2: Show the pre-rendered embed instantly when user navigates
const MyPage = () => (
  // Connects to the already-loaded pre-render — no network wait
  <AppEmbed preRenderId="pre-render" className="embed-div" />
);
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/pre-rendering)

## Documentation
  - [Pre-Render Config](https://developers.thoughtspot.com/docs/Interface_AppViewConfig#_prerenderid)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/pre-rendering
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