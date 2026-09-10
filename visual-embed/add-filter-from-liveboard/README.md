# Add Filter (Edit Mode) Demo

Embeds a Liveboard and adds an **Add Filter** button outside the ThoughtSpot UI. Clicking it:

1. Triggers `HostEvent.Edit` to switch the Liveboard into edit mode.
2. Once that's acknowledged, triggers `HostEvent.OpenAddFilterModal` to open the Add Filter modal — the same modal the in-app "Add filter" button opens.

Two equivalent implementations of the same flow live side by side:

- `vanilla/` — plain JS + Vite, no framework.
- `react/` — the same logic ported to React (official `@thoughtspot/visual-embed-sdk/react` `LiveboardEmbed` component + hooks).

## Run it

```bash
cd vanilla   # or: cd react
npm install
npm run dev
```

Open http://localhost:8642 for `vanilla/`, or http://localhost:8643 for `react/`.

Set your cluster host, credentials, and Liveboard ID in `vanilla/.env` or `react/.env`:

```
VITE_THOUGHTSPOT_HOST=https://training.thoughtspot.cloud
VITE_THOUGHTSPOT_USERNAME=code-sandbox
VITE_THOUGHTSPOT_PASSWORD="PASSWORD"
VITE_LIVEBOARD_ID=b504e160-3025-4508-a76a-1beb1f4b5eed
```

`AuthType.Basic` is already configured with the credentials above. Swap it for your org's real auth type (SSO/trusted auth).

The logged-in user must have edit permission on the Liveboard for the Edit/OpenAddFilterModal sequence to succeed.

## How the race condition is avoided

- **`isLiveboardReady` guard** — the button stays disabled until `EmbedEvent.LiveboardRendered` fires, so no host event is sent before the embed has registered handlers for it.
- **Sequenced on the SDK's own readiness signal, not on `trigger()`** — `HostEvent.OpenAddFilterModal` is only fired once the embedded app has confirmed (via `embed.subscribedEvent`) that it's registered a handler for it. See the **Gotcha** below for why we don't rely on the `trigger()` promise for this.
- **`isTransitioning` guard** — blocks re-entrant clicks (e.g. rapid double-click) from firing a second overlapping Edit/OpenAddFilterModal sequence while the first is still in flight; it's reset in a `finally` block so a failed sequence doesn't leave the button permanently disabled.

## Gotcha: don't `await trigger()` to know when a host event took effect

`liveboardEmbed.trigger(hostEvent)`'s promise only resolves once the embedded app explicitly acknowledges it — and for `HostEvent.Edit` / `HostEvent.OpenAddFilterModal`, that acknowledgment never comes, so the promise just rides out the full 30s timeout and then resolves anyway (not rejects) with an `Error` object. Awaiting it tells you nothing useful about whether the action happened.

Instead: fire the trigger without awaiting it, and rely on the SDK's own signals — `EmbedEvent`s and `embed.subscribedEvent(hostEvent)` (fires once, the instant the embedded app registers a handler for that host event) — to know when it's safe to sequence the next step. See `waitForReady()` / `triggerOnceReady()` / `isOpenAddFilterModalReady(Ref)` in `vanilla/src/main.js` / `react/src/App.jsx`.

## Files

### `vanilla/`

- `index.html` — layout: embed container + button + loader overlay.
- `src/main.js` — SDK init, embed setup, and the click handler described above.
- `package.json` — `@thoughtspot/visual-embed-sdk` dependency + Vite dev/build scripts.

### `react/`

- `index.html` — page shell: styles + `#root` mount point.
- `src/main.jsx` — React entry point, mounts `<App />`.
- `src/App.jsx` — same SDK init, embed setup, and click handler, ported to hooks. Uses the official `@thoughtspot/visual-embed-sdk/react` `LiveboardEmbed` component and `useEmbedRef` instead of the raw `LiveboardEmbed` class. Calls `init()` directly at module load rather than via the `useInit` hook — see the comment above that call in `App.jsx` for why.
- `package.json` — `@thoughtspot/visual-embed-sdk`, React, and Vite dev/build scripts (dev server on port 8643 to avoid clashing with `vanilla/`).
