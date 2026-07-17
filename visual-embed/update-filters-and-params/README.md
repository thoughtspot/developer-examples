<!-- search-meta
tags: [filters, parameters, runtime-filters, runtime-parameters, host-events, useHostEventsV2, subscribed-event, timing, UpdateFilters, UpdateRuntimeFilters, UpdateParameters, React, TypeScript]
apis: [runtimeFilters, runtimeParameters, HostEvent, UpdateRuntimeFilters, UpdateFilters, UpdateParameters, RuntimeFilterOp, RuntimeParameter, subscribedEvent, useHostEventsV2, LiveboardEmbed, SearchEmbed, AppEmbed, SpotterEmbed, useEmbedRef, trigger, on]
questions:
  - How do I apply filters programmatically on an embedded Liveboard or Search?
  - How do I update filters on a ThoughtSpot embed after it has loaded?
  - How do I pass runtime parameters when embedding a Liveboard?
  - How do I update runtime parameters on an embedded Liveboard from my app?
  - What payload does HostEvent.UpdateParameters expect?
  - Should I use runtimeFilters or HostEvent.UpdateFilters to set filters?
  - What is the difference between UpdateRuntimeFilters and UpdateFilters?
  - Why is HostEvent.UpdateFilters not firing or not working in my embed?
  - When is it safe to trigger a host event after the embed loads?
  - What is the recommended way to trigger any host event at load time?
  - How do I use subscribedEvent to know a host event is ready?
  - Does subscribedEvent work on SearchEmbed, AppEmbed, and SpotterEmbed too?
  - Do I need useHostEventsV2 for the Subscribed embed event to fire?
  - How do I update runtime filters from a button in my app?
-->

# update-filters-and-params

Working patterns and a decision guide for applying **filters and parameters** to embedded ThoughtSpot content programmatically — at init via `runtimeFilters` / `runtimeParameters`, and after load via the `UpdateRuntimeFilters`, `UpdateFilters`, and `UpdateParameters` host events, including the `subscribedEvent` readiness pattern (requires `useHostEventsV2: true`).

## Which mechanism to use

| Your situation | Use | Since |
|---|---|---|
| Filters/parameters are known when you render the embed | **`runtimeFilters`** / **`runtimeParameters`** view-config options — simplest, no events, no timing concerns | SDK 1.9.0 |
| Filters change after load (button, external UI) | **`HostEvent.UpdateRuntimeFilters`** — array of `{ columnName, operator, values }` | SDK 1.9.0 / TS 8.1.0.cl |
| Updating values of a filter that already exists on the Liveboard | **`HostEvent.UpdateFilters`** — `{ filters: [{ column, oper, values }] }` | SDK 1.23.0 / TS 9.4.0.cl |
| Parameter values change after load | **`HostEvent.UpdateParameters`** — array of `{ name, value, isVisibleToUser? }` | SDK 1.29.0 / TS 10.1.0.cl |
| Triggering **any** host event at load time — the standard, recommended pattern | **`embed.subscribedEvent(HostEvent.X)`** listener — fires the exact moment the event is safe to trigger. **Only fires when `useHostEventsV2: true` is set in the embed view config** | SDK 1.45.2+ / TS 26.3.0.cl+ |

Good to know:

- **The `subscribedEvent` readiness pattern works on every embed type** — it is defined on the shared embed base class, so `LiveboardEmbed`, `SearchEmbed`, `SearchBarEmbed`, `AppEmbed`, and `SpotterEmbed` all support it. Prefer it over ad-hoc `Load`/`Data`/`LiveboardRendered` timing for any load-time trigger.
- **`UpdateRuntimeFilters` resets the embedded object to its original state** before applying the new conditions — user changes such as drill-downs are cleared.
- If multiple columns share a name, disambiguate with the `WORKSHEET_NAME::COLUMN_NAME` format in `UpdateFilters` (e.g. `"(Sample) Retail - Apparel::city"`).
- **Common pitfall:** wiring the `Subscribed` readiness listener **without** enabling `useHostEventsV2` — the listener silently never fires. On clusters older than 26.3.0.cl, trigger from `EmbedEvent.Load`/`EmbedEvent.Data` instead, guarded so it runs once.

## Key Usage

```typescript
import {
  AuthType,
  HostEvent,
  RuntimeFilterOp,
  init,
  type EmbedEvent,
} from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed, useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";
import { useEffect } from "react";

// init() must run BEFORE any embed component mounts — call it at module scope.
// (The useInit hook runs in a parent effect, which fires AFTER child effects,
// so the embed can construct before init and fail with "Please provide a valid URL".)
init({
  thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
  authType: AuthType.None,
});

const App = () => {
  const embedRef = useEmbedRef<typeof LiveboardEmbed>();

  // AFTER LOAD — update runtime filters from your app's UI.
  // Note: resets the object to its original state (drills are cleared) before applying.
  const updateRuntimeFilters = () => {
    embedRef.current?.trigger(HostEvent.UpdateRuntimeFilters, [
      { columnName: "state", operator: RuntimeFilterOp.EQ, values: ["michigan"] },
    ]);
  };

  // AFTER LOAD — update values of filters that already exist on the Liveboard.
  // Disambiguate duplicate column names with "WORKSHEET_NAME::COLUMN_NAME".
  const updateExistingFilters = () => {
    embedRef.current?.trigger(HostEvent.UpdateFilters, {
      filters: [{ column: "item type", oper: "IN", values: ["shoes", "boots"] }],
    });
  };

  // AFTER LOAD — update Parameter values (SDK 1.29.0+ / TS 10.1.0.cl+).
  const updateParameters = () => {
    embedRef.current?.trigger(HostEvent.UpdateParameters, [
      { name: "Discount", value: 0.25, isVisibleToUser: true },
    ]);
  };

  // READINESS — the standard pattern for triggering ANY host event at load time,
  // on ANY embed type (LiveboardEmbed, SearchEmbed, AppEmbed, SpotterEmbed — the
  // method is on the shared embed base class). Fires the moment the embedded app
  // has registered its handler, so the trigger cannot be dropped. Same pattern for
  // UpdateParameters, UpdateRuntimeFilters, or any other host event.
  // REQUIRES useHostEventsV2: true on the embed (see props below) — without the
  // flag this "<Event> Subscribed" signal NEVER fires.
  useEffect(() => {
    const embed = embedRef.current;
    if (!embed) return;
    const subscribed = embed.subscribedEvent(HostEvent.UpdateFilters) as EmbedEvent;
    const onReady = () => {
      embed.trigger(HostEvent.UpdateFilters, {
        filters: [{ column: "date", oper: "EQ", values: ["JULY", "2023"], type: "MONTH_YEAR" }],
      });
    };
    embed.on(subscribed, onReady);
    return () => {
      embed.off(subscribed, onReady);
    };
  }, []);

  return (
    <>
      <button onClick={updateRuntimeFilters}>Update runtime filters</button>
      <button onClick={updateExistingFilters}>Update existing filters</button>
      <button onClick={updateParameters}>Update parameters</button>
      <LiveboardEmbed
        ref={embedRef}
        liveboardId="your-liveboard-id"
        // AT INIT — filters/parameters known upfront: pass them in the view config.
        // Prefer this whenever possible; no events or timing involved.
        runtimeFilters={[
          { columnName: "state", operator: RuntimeFilterOp.EQ, values: ["california"] },
        ]}
        runtimeParameters={[{ name: "Discount", value: 0.1 }]}
        // Required for the subscribedEvent readiness pattern (SDK 1.45.2+ / TS 26.3.0.cl+).
        useHostEventsV2
      />
    </>
  );
};
```

## Documentation

- [Runtime filters](https://developers.thoughtspot.com/docs/runtime-filters)
- [Runtime parameters](https://developers.thoughtspot.com/docs/runtime-parameters)
- [Filter types and application layers](https://developers.thoughtspot.com/docs/filters-overview)
- [Using host events](https://developers.thoughtspot.com/docs/host-events)
- [HostEvent reference](https://developers.thoughtspot.com/docs/Enumeration_HostEvent)

## Demo

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/visual-embed/update-filters-and-params)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/update-filters-and-params
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
