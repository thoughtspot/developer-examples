# Pre-Render On Demand

**Routes:** `/pre-render-on-demand/home` · `/pre-render-on-demand/liveboard`

Same as Pre-Render Embed, but pre-rendering only begins when the user first visits the Home tab — not at app start. All subsequent visits to the Liveboard tab reuse the cached shell.

## How it works

### Home tab — starts pre-rendering on first visit (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render-on-demand"
  liveboardId="..."
/>
```

The `PreRenderedLiveboardEmbed` mounts when the `/home` route renders for the first time. The SDK creates the hidden iframe at that point. Because React Router keeps the parent layout mounted, the shell persists as you navigate to `/liveboard` and back.

### Liveboard tab — connects to the shell

```tsx
<LiveboardEmbed
  preRenderId="pre-render-on-demand"
  liveboardId="..."
  className="embed-div"
/>
```

Identical to the Pre-Render Embed consumer — `preRenderId` is the link.

## Difference from Pre-Render Embed

| | Pre-Render Embed | Pre-Render On Demand |
|---|---|---|
| When does loading start? | At app load (global init) | On first visit to `/home` |
| Useful when | You always need this board | You pre-render only if the user reaches this section |

## What to observe

Navigate directly to `/liveboard` without visiting `/home` first — it cold-loads. Then go to `/home` and wait for the green badge, then switch to `/liveboard` — instant.
