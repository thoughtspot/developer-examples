# Pre-Render Liveboard (With ID)

**Routes:** `/pre-render-with-liveboard-id/home` · `/pre-render-with-liveboard-id/liveboard`

Pre-renders a specific liveboard by ID. Both the hidden shell and the visible consumer name the same `liveboardId`, so the SDK can begin fetching data for that exact board during pre-rendering.

## How it works

### Home tab — shell with a fixed board (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render-with-liveboard-id"
  liveboardId="..."
/>
```

Passing `liveboardId` to `PreRenderedLiveboardEmbed` tells the SDK which board to load inside the hidden iframe. Data fetching starts immediately.

### Liveboard tab — consumer with the same ID

```tsx
<LiveboardEmbed
  preRenderId="pre-render-with-liveboard-id"
  liveboardId="..."
  className="embed-div"
/>
```

Because the `liveboardId` matches, the SDK promotes the hidden iframe to visible without re-fetching.

## Difference from Pre-Render Without Liveboard ID

| | With ID | Without ID |
|---|---|---|
| Shell specificity | One board pre-loaded | Generic shell, board set at show time |
| Can serve multiple boards? | No — shell is tied to one `liveboardId` | Yes — any `liveboardId` can reuse the shell |
| Data pre-fetched? | Yes | No — data loads when `liveboardId` is set on the consumer |

## What to observe

The Liveboard tab appears near-instantly after the Home tab signals loaded. The data was already fetched during pre-rendering.
