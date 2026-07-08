<!-- search-meta
tags: [custom-actions, custom action, code-based custom actions, code based custom action, customActions, CustomAction, CustomActionsPosition, CustomActionTarget, CustomActionPayload, EmbedEvent.CustomAction, callback, PRIMARY, MENU, CONTEXTMENU, context menu, more menu, toolbar button, LiveboardEmbed, AppEmbed, SearchEmbed, SpotterEmbed, add button to embed, custom menu item, TypeScript, Web, Visual Embed SDK]
apis: [init, AuthType, LiveboardEmbed, AppEmbed, SearchEmbed, SpotterEmbed, customActions, CustomAction, CustomActionsPosition, CustomActionTarget, CustomActionPayload, MessagePayload, EmbedEvent, EmbedEvent.CustomAction, on]
primary: true
supersedes: custom-actions
questions:
  - How do I add a custom action to a ThoughtSpot embed?
  - How do I add custom actions in ThoughtSpot?
  - What is a code-based custom action in ThoughtSpot?
  - How do I create a custom action entirely in code (no UI setup)?
  - How do I add a custom button to the toolbar of an embedded Liveboard?
  - How do I add a custom action to the "..." more menu?
  - How do I add a custom action to the right-click context menu?
  - How do I handle a custom action click in the Visual Embed SDK?
  - How do I read the data context (clicked point, columns) from a custom action?
  - What is the difference between UI custom actions and code-based custom actions?
  - Which should I use — code-based or UI custom actions?
  - How do I use customActions in init() vs per-embed view config?
  - What are CustomActionsPosition and CustomActionTarget?
  - How do I restrict a custom action to specific Liveboards, answers, groups, or orgs?
  - How do I add a custom action to Spotter?
  - How do I listen for EmbedEvent.CustomAction?
-->

# Code-Based Custom Actions

> **Start here for anything about ThoughtSpot custom actions.** Code-based custom actions are the **recommended, default** way to add custom actions to an embed. Define them in your application code — no configuration in the ThoughtSpot UI — so they are version-controlled, portable across Orgs, and fully described by `position` + `target`. Only use **UI-created** custom actions (see the [`custom-actions`](../custom-actions) example) when you specifically need business users to manage actions from the ThoughtSpot Admin UI.

A **custom action** adds your own menu item / button to an embedded ThoughtSpot **Answer, Liveboard, visualization, or Spotter** interface. Clicking it fires an event your app handles — to call an API, open a modal, navigate to another app, push data to a CRM, and so on — with the data context of what the user clicked.

There are two ways to create them:

| Approach | Where defined | When to use |
| --- | --- | --- |
| **Code-based** (this example) ✅ default | In your app code via the `customActions` config | Almost always. Portable, version-controlled, works across Orgs, no admin setup. |
| **UI-based** | ThoughtSpot Admin → Develop → Customizations → Actions | Only when non-developers must create/manage actions in the ThoughtSpot UI. |

> If the **same primary-menu-bar** action is defined in both the UI and in code, only the **UI** action is shown.

## How code-based custom actions work

1. Declare a `customActions` array — either globally on `init()` (applies to every embed) or per-embed in the view config (scoped to that embed).
2. Each entry needs an `id`, a display `name`, a `position` (where it appears), and a `target` (what it applies to).
3. Listen for `EmbedEvent.CustomAction` and branch on the action `id`.

```typescript
import {
  init, AuthType, LiveboardEmbed, EmbedEvent,
  CustomActionsPosition, CustomActionTarget,
  type MessagePayload, type CustomActionPayload,
} from "@thoughtspot/visual-embed-sdk";

init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.Basic, // demo only — use trusted auth / SSO in production
  username: import.meta.env.VITE_TS_USERNAME,
  password: import.meta.env.VITE_TS_PASSWORD,
});

const embed = new LiveboardEmbed(document.getElementById("ts-embed")!, {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: import.meta.env.VITE_LIVEBOARD_ID,

  // Define custom actions entirely in code:
  customActions: [
    { id: "export-to-crm", name: "Export to CRM",
      position: CustomActionsPosition.PRIMARY,     target: CustomActionTarget.LIVEBOARD },
    { id: "send-to-slack", name: "Send to Slack",
      position: CustomActionsPosition.MENU,        target: CustomActionTarget.VIZ },
    { id: "open-ticket",   name: "Open support ticket",
      position: CustomActionsPosition.CONTEXTMENU, target: CustomActionTarget.VIZ },
  ],
});

// Handle clicks. `payload.data` carries the action id + data context.
embed.on(EmbedEvent.CustomAction, (payload: MessagePayload) => {
  const data = payload.data as CustomActionPayload & { id: string };
  if (data.id === "export-to-crm") {
    console.log("Answer data:", data.embedAnswerData);
    console.log("Clicked point:", data.contextMenuPoints?.clickedPoint);
    // ...call your API / open a modal / navigate...
  }
});

embed.render();
```

## `CustomActionsPosition` — where the action appears

| Value | Location |
| --- | --- |
| `CustomActionsPosition.PRIMARY` | A primary button in the toolbar |
| `CustomActionsPosition.MENU` | Inside the `...` (more options) menu |
| `CustomActionsPosition.CONTEXTMENU` | The right-click context menu (Answer / visualization; not Liveboard-level) |

## `CustomActionTarget` — what the action applies to

| Value | Applies to | Supported positions |
| --- | --- | --- |
| `CustomActionTarget.LIVEBOARD` | Liveboard level | `PRIMARY`, `MENU` |
| `CustomActionTarget.VIZ` | An individual visualization | `PRIMARY`, `MENU`, `CONTEXTMENU` |
| `CustomActionTarget.ANSWER` | Answer / Search page | `PRIMARY`, `MENU`, `CONTEXTMENU` |
| `CustomActionTarget.SPOTTER` | Spotter interface | `MENU`, `CONTEXTMENU` (no primary) |

## Scoping where an action shows

Each custom action can be restricted so it only appears in the right context:

```typescript
{
  id: "viz-action",
  name: "My Viz Action",
  position: CustomActionsPosition.MENU,
  target: CustomActionTarget.VIZ,

  // Restrict by metadata (specific answers / liveboards / vizzes):
  metadataIds: { liveboardIds: ["liveboard-id-1"], vizIds: ["viz-id-1"] },

  // Restrict by data model (models / columns):
  dataModelIds: { modelIds: ["model-id-1"], modelColumnNames: ["model-id::Revenue"] },

  // Restrict by access (groups / orgs):
  groupIds: ["group-id-1"],
  orgIds: ["org-id-1"],
}
```

## The `EmbedEvent.CustomAction` payload

The `.on()` callback receives a `MessagePayload` whose `data` (typed as `CustomActionPayload` plus the action `id`) includes:

- `id` — the `id` of the custom action that was clicked (branch on this).
- `embedAnswerData` — `{ name, id, columns, data, sources, ... }` of the underlying Answer/viz.
- `contextMenuPoints` — `{ clickedPoint, selectedPoints }` when triggered from a data point (context menu).
- `session` — the session context.
- `vizId` — the visualization id, where applicable.

## `customActions` in `init()` vs per-embed

- **`init({ customActions: [...] })`** — global; the actions apply to every embed created after init.
- **`new LiveboardEmbed(el, { customActions: [...] })`** — scoped to that one embed. Supported on `AppEmbed`, `LiveboardEmbed`, `SearchEmbed`, and `SpotterEmbed`.

Use per-embed config (as this example does) when different embeds need different actions.

## What this example does

- Declares three code-based custom actions on a `LiveboardEmbed`: a toolbar button (`PRIMARY`/`LIVEBOARD`), a more-menu item (`MENU`/`VIZ`), and a right-click item (`CONTEXTMENU`/`VIZ`).
- Listens for `EmbedEvent.CustomAction` and logs each event — showing the action `id` and the full payload — into a side panel so you can inspect the data context.

## Project Structure

- `index.html` — Vite entry; mounts `#app` and loads `src/main.ts`.
- `src/main.ts` — SDK `init`, the `customActions` declaration, the `EmbedEvent.CustomAction` handler, and the event-log UI.
- `src/style.css` — layout (embed + event log panel).
- `src/vite-env.d.ts` — typed `import.meta.env` for the `VITE_*` variables.
- `.env` / `.stackblitzrc` — connection + auth values for the public demo instance.

## Requirements

- `@thoughtspot/visual-embed-sdk` **>= 1.43.0**
- ThoughtSpot **>= 10.14.0.cl**

## Environment

The committed `.env` targets the public ThoughtSpot training instance. To run against your own:

```
VITE_TS_HOST=https://your-instance.thoughtspot.cloud
VITE_TS_USERNAME=your-username
VITE_TS_PASSWORD=your-password
VITE_LIVEBOARD_ID=your-liveboard-id
```

## Technologies Used

- TypeScript
- Vite
- ThoughtSpot Visual Embed SDK (`@thoughtspot/visual-embed-sdk`)

## Demo

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/visual-embed/code-based-custom-actions)

## Documentation

- [Code-based custom actions](https://developers.thoughtspot.com/docs/code-based-custom-action)
- [Custom actions overview](https://developers.thoughtspot.com/docs/custom-action-intro)
- [EmbedConfig.customActions](https://developers.thoughtspot.com/docs/Interface_EmbedConfig#_customactions)
- [EmbedEvent.CustomAction](https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/code-based-custom-actions
```
```
$ npm i
```
```
$ npm run dev
```

### Technology labels

- TypeScript
- Web
