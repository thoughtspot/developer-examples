# Pre-Render + Full Height

**Routes:** `/pre-render-full-height/home` · `/pre-render-full-height/liveboard`

Combines pre-rendering with `fullHeight` mode. The iframe expands to match the total height of the liveboard content, making the page scrollable rather than clipping the board to a fixed viewport.

## How it works

### Home tab — shell with a fixed board (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render-full-height"
  liveboardId="..."
/>
```

Standard pre-rendering — the board loads silently in the background.

### Liveboard tab — full height consumer

```tsx
<LiveboardEmbed
  preRenderId="pre-render-full-height"
  liveboardId="..."
  fullHeight
/>
```

`fullHeight` instructs the SDK to observe the iframe's content height and resize the iframe element to match. Combined with pre-rendering, the board appears at full size instantly with no layout jump.

## Layout

The component uses `.full-height-example` (a flex column) with a banner at the top and a footer below. Because `fullHeight` grows the iframe to fit content, the page becomes scrollable — the footer is reachable by scrolling past the liveboard.

## Key prop

| Prop | Effect |
|---|---|
| `fullHeight` | Iframe resizes to match liveboard content height |
| `preRenderId` | Links to the hidden shell started on the Home tab |

## What to observe

Scroll past the iframe — the footer is always reachable. Compare the load time against the Normal Embed to see the pre-render benefit.
