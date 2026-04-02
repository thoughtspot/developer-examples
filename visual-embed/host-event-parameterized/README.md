<!-- search-meta
tags: [HostEvent, pin, save, React, TypeScript, parameters, host-events, trigger]
apis: [HostEvent, EmbedEvent, trigger, on, LiveboardEmbed, SearchEmbed, useEmbedRef, useInit]
questions:
  - How do I trigger a host event with parameters in ThoughtSpot embed?
  - How do I pin a visualization to a liveboard from an embedded ThoughtSpot experience?
  - How do I trigger the save event with custom parameters in ThoughtSpot?
  - How do I use parameterized host events in ThoughtSpot embed?
-->

# host-event-parameterized

Examples on how to use host event with parameters.

## Key Usage

```typescript
import { AuthType, HostEvent } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed, useEmbedRef, useInit } from "@thoughtspot/visual-embed-sdk/react";

const App = () => {
  useInit({
    thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
    authType: AuthType.Basic,
    username: "your-username",
    password: "your-password",
  });

  const liveboardRef = useEmbedRef<typeof LiveboardEmbed>();

  // Trigger pin host event with parameters
  const handlePin = async () => {
    await liveboardRef.current.trigger(HostEvent.Pin, {
      newVizName: "My Pinned Chart",
      vizId: "your-viz-id",
      liveboardId: "your-liveboard-id",
    });
  };

  return (
    <>
      <LiveboardEmbed liveboardId="your-liveboard-id" ref={liveboardRef} />
      <button onClick={handlePin}>Pin to Liveboard</button>
    </>
  );
};
```

## Documentation

- [Host Event Parameterization](https://developers.thoughtspot.com/docs/events-app-integration#hostEventParameterization)
- [Pin event with params](https://developers.thoughtspot.com/docs/events-app-integration#_parameters_for_hostevent_pin)
- [Save event with params](https://developers.thoughtspot.com/docs/events-app-integration#_parameters_for_hostevent_saveanswer)
- [Host Events](https://developers.thoughtspot.com/docs/Enumeration_HostEvent)

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/host-event-parameterized)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/host-event-parameterized
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