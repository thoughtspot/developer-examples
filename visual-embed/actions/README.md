<!-- search-meta
tags: [Action, actions, menu actions, visibleActions, hiddenActions, disabledActions, disabledActionReason, LiveboardEmbed, AppEmbed, SearchEmbed, SpotterEmbed, allow-list, deny-list, toolbar, context menu, TypeScript, Web, Visual Embed SDK]
apis: [init, AuthType, LiveboardEmbed, Action, visibleActions, hiddenActions, disabledActions, disabledActionReason, EmbedEvent, ViewConfig, LiveboardViewConfig]
questions:
  - How do I show only specific actions in an embedded ThoughtSpot view?
  - How do I hide actions like Share or Edit in a LiveboardEmbed?
  - What is the difference between hiddenActions and disabledActions?
  - When should I use visibleActions vs hiddenActions?
  - How do I grey out (disable) an action and show a reason on hover?
  - What is the Action enum in the Visual Embed SDK?
  - How do I use visibleActions as an allow-list to restrict the toolbar?
  - How do I remove the Download or Share button from an embedded Liveboard?
  - Why is my action still showing even though I added it to hiddenActions?
  - Do visibleActions and hiddenActions work together?
  - How do I hide a child action like Download as PDF?
  - How do I control the action menu in AppEmbed, SearchEmbed, or SpotterEmbed?
-->

# actions

A TypeScript + Vite example that shows how to control the **built-in action menu** of an embedded ThoughtSpot view using the [`Action`](https://developers.thoughtspot.com/docs/Enumeration_Action) enum. The demo embeds a Liveboard and lets you flip between allow-list, deny-list, and disabled modes so you can watch the toolbar and `...` (more) menu change live.

## What are "actions"?

Every user-initiated command in a ThoughtSpot view — **Download**, **Share**, **Edit**, **Drill down**, **Schedule**, **Pin**, **SpotIQ analyze**, and so on — is a menu/toolbar item that the Visual Embed SDK represents as a member of the `Action` enum (e.g. `Action.Download`, `Action.Share`, `Action.Edit`). These appear in the top toolbar, the per-visualization `...` menu, and right-click context menus.

When you embed ThoughtSpot inside your own app you usually want to **curate** which of these the end user sees — for example, expose only **Download** and **Drill down** to viewers, or hide **Edit** and **Delete** so users can't modify content. You do that declaratively through three view-config options. No CSS hacks, no DOM surgery.

## The three controls

| Option | Type | Behaviour |
| --- | --- | --- |
| `visibleActions` | `Action[]` | **Allow-list.** Only the listed actions are shown; every other action is hidden. Use when you want a tightly-scoped toolbar. |
| `hiddenActions` | `Action[]` | **Deny-list.** The listed actions are removed from the UI entirely. Use when you want the full menu *minus a few* items. |
| `disabledActions` | `Action[]` | The listed actions stay **visible but greyed-out and non-clickable**. Pair with `disabledActionReason` to show a tooltip explaining why. |
| `disabledActionReason` | `string` | Tooltip text shown when a user hovers a disabled action. |

> ⚠️ **`visibleActions` and `hiddenActions` are mutually exclusive.** Provide one or the other — never both on the same embed. If you set both, behaviour is undefined and the SDK logs a warning.

### Which one should I use?

- **Show a small, fixed set of actions** → `visibleActions` (allow-list). Safest for locked-down viewer experiences because new actions added in future ThoughtSpot releases stay hidden by default.
- **Keep almost everything, drop a few** → `hiddenActions` (deny-list). Convenient, but remember that future releases may introduce new actions you didn't explicitly hide.
- **Signal that an action exists but isn't available right now** (entitlement, role, demo) → `disabledActions` + `disabledActionReason`.

## Key Usage

```typescript
import { init, AuthType, LiveboardEmbed, Action, EmbedEvent } from "@thoughtspot/visual-embed-sdk";

// Initialize once for the whole app.
// NOTE: AuthType.Basic with username/password is for DEMO only.
// In production use trusted auth or SSO — never ship credentials to the browser.
init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_TS_USERNAME,
  password: import.meta.env.VITE_TS_PASSWORD,
});

const embed = new LiveboardEmbed(document.getElementById("ts-embed")!, {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: import.meta.env.VITE_LIVEBOARD_ID,

  // --- pick ONE of the following strategies ---

  // 1) Allow-list: ONLY these actions are shown.
  visibleActions: [Action.DownloadAsPdf, Action.Share, Action.DrillDown],

  // 2) Deny-list (don't combine with visibleActions): remove from the UI.
  // hiddenActions: [Action.Share, Action.Edit, Action.Schedule],

  // 3) Greyed-out but visible, with a hover reason.
  // disabledActions: [Action.DownloadAsPdf, Action.Share],
  // disabledActionReason: "Not available in this demo",
});

embed.on(EmbedEvent.Error, (e) => console.error("Embed error:", e));
embed.render();
```

## Commonly used `Action` enum members

A quick reference of frequently-curated actions (the enum has 150+ members — see the full reference link below):

| `Action` member | UI command |
| --- | --- |
| `Action.Save` | Save an Answer / Liveboard |
| `Action.Edit` | Open in edit mode |
| `Action.Share` | Share with users/groups |
| `Action.Download` | Download (parent action) |
| `Action.DownloadAsPdf` | Download → PDF |
| `Action.DownloadAsCsv` | Download → CSV |
| `Action.DownloadAsXlsx` | Download → XLSX |
| `Action.DownloadAsPng` | Download → PNG |
| `Action.DrillDown` | Drill down on a data point |
| `Action.Pin` | Pin an Answer to a Liveboard |
| `Action.Schedule` | Schedule a Liveboard job |
| `Action.SpotIQAnalyze` | Run SpotIQ analysis |
| `Action.ShowUnderlyingData` | Show underlying raw data |
| `Action.Explore` | Explore a visualization |
| `Action.AddFilter` | Add a filter to a Liveboard |
| `Action.Present` | Present mode |
| `Action.MakeACopy` | Make a copy |
| `Action.AskAi` / `Action.SpotterViz` | Spotter entry points |

## Features

- Plain **TypeScript + Vite** — no framework, minimal dependencies.
- One-click switching between `all`, `visibleActions`, `hiddenActions`, and `disabledActions` modes.
- Re-renders the `LiveboardEmbed` on each switch so the toolbar/menu visibly updates.
- Shows the live view-config snippet for the selected mode above the embed.
- Listens for `EmbedEvent.Error` and logs to the console.

## How It Works

1. `init(...)` is called once at module load to configure the host and auth.
2. `buildConfig(mode)` returns a `LiveboardViewConfig` for the selected mode — adding `visibleActions`, `hiddenActions`, or `disabledActions` (with `disabledActionReason`) as appropriate.
3. `renderEmbed(mode)` clears the container, constructs a fresh `LiveboardEmbed` with that config, and calls `render()`.
4. The mode buttons call `selectMode(...)`, which updates the active button, swaps the displayed code snippet, and triggers a re-render.

## Project Structure

- `index.html` — Vite entry; mounts `#app` and loads `src/main.ts`.
- `src/main.ts` — SDK `init`, the mode/config logic (`buildConfig`), the embed render logic (`renderEmbed`), and the UI wiring.
- `src/style.css` — light-theme styling for the controls, code snippet, and embed frame.
- `src/vite-env.d.ts` — typed `import.meta.env` for the `VITE_*` variables.
- `.env` / `.stackblitzrc` — connection + auth values for the public demo instance.

## Works with other embed types

`visibleActions` / `hiddenActions` / `disabledActions` are part of the shared `ViewConfig`, so the same pattern applies to:

- `LiveboardEmbed` (this example)
- `AppEmbed` (full-app embedding)
- `SearchEmbed` (Search / Answer)
- `SpotterEmbed` (Spotter conversational analytics)

Just pass the same options to whichever embed component you're constructing.

## Gotchas

- **Don't combine** `visibleActions` and `hiddenActions` on the same embed — pick one strategy.
- **Parent vs child actions.** Some actions are children of a parent menu. To control a child like `Action.DownloadAsPdf`, the parent (`Action.Download`) generally needs to be present too. For TML options, the parent `Action.TML` must be included for the cascading menu items to appear.
- **Allow-list is future-proof, deny-list is not.** New ThoughtSpot releases add new actions; with `visibleActions` they stay hidden automatically, with `hiddenActions` they will appear unless you add them.
- **An action only shows if the user has permission and the feature is enabled** — hiding it in the SDK is a UI control, not a security boundary. Enforce real authorization server-side / via ThoughtSpot roles.

## Environment

The committed `.env` points at the public ThoughtSpot training instance. To run against your own, set:

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

Open in [StackBlitz](https://stackblitz.com/github/thoughtspot/developer-examples/tree/main/visual-embed/actions)

## Documentation

- [Action enum reference](https://developers.thoughtspot.com/docs/Enumeration_Action)
- [Show or hide UI actions](https://developers.thoughtspot.com/docs/embed-actions)
- [Embed a Liveboard](https://developers.thoughtspot.com/docs/embed-liveboard)
- [Visual Embed SDK getting started](https://developers.thoughtspot.com/docs/getting-started)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/actions
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
