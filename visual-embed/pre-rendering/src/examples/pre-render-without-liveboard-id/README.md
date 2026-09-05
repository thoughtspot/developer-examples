# Pre-Render Liveboard (Without ID)

**Routes:** `/pre-render-without-liveboard-id/home` · `/pre-render-without-liveboard-id/liveboard-1` · `/pre-render-without-liveboard-id/liveboard-2`

One pre-rendered shell serves two different liveboards. Because no `liveboardId` is given to the shell, any consumer can claim it and supply its own board ID, actions, and styles.

## How it works

### Home tab — generic shell (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render-without-liveboard-id"
  // no liveboardId
/>
```

The SDK creates a hidden iframe but does not load any board yet. The shell is ready and waiting.

### Liveboard tabs — consumers supply the board

```tsx
<LiveboardEmbed
  preRenderId="pre-render-without-liveboard-id"
  liveboardId="..."        // different per tab
  hiddenActions={[...]}    // different per tab
  customizations={{ style: { customCSS: { variables: { ... } } } }}
/>
```

When a consumer mounts, it claims the shell and provides the `liveboardId`. The SDK loads that board into the existing iframe. Each tab also applies its own `hiddenActions` and CSS variable overrides.

## Per-tab configuration

| | Liveboard 1 | Liveboard 2 |
|---|---|---|
| `hiddenActions` | Share, Present | Edit, Download as CSV |
| Accent color | `#1976D2` (blue) | `#7B1FA2` (purple) |
| Background | `#0a1929` | `#1a0a2e` |

## Custom loader & render time

This example uses `LoaderContext` (via React Router's outlet context) to share state from the sub-nav layout down to each liveboard component:

- **Custom loader** — a checkbox in the sub-nav toggles an overlay spinner that covers the embed until `onLiveboardRendered` fires.
- **Render time** — recorded from component mount to `onLiveboardRendered`, displayed in the footer.

## What to observe

Switch between Liveboard 1 and Liveboard 2. The shell iframe is reused — only the board content and styles change. One background connection, two different views.
