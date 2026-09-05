# Pre-Render Full Height (No ID)

**Routes:** `/pre-render-full-height-no-id/home` · `/pre-render-full-height-no-id/liveboard-1` · `/pre-render-full-height-no-id/liveboard-2`

Combines the "no ID" shell pattern with `fullHeight`. One generic pre-rendered shell is reused across two liveboards, both rendered at full content height.

## How it works

### Home tab — generic shell (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render-full-height-no-id"
  // no liveboardId
/>
```

A shell iframe is created in the background without loading any specific board.

### Liveboard tabs — consumers with `fullHeight`

```tsx
<LiveboardEmbed
  preRenderId="pre-render-full-height-no-id"
  liveboardId="..."   // different per tab
  fullHeight
/>
```

Each tab claims the same shell and supplies its own `liveboardId`. `fullHeight` makes the iframe grow to fit that board's content.

## Custom loader & render time

State is shared from the `LoaderLayout` (sub-nav) down to each component via React Router's outlet context (`LoaderContext`):

```tsx
// In LoaderLayout (App.tsx)
<Outlet context={{ showLoader } satisfies LoaderContext} />

// In each liveboard component
const { showLoader } = useOutletContext<LoaderContext>();
```

- **Custom loader** — toggled by a checkbox in the sub-nav. When enabled, an absolutely positioned overlay (`position: absolute; inset: 0`) covers the `liveboard-wrapper` until `onLiveboardRendered` fires. The checkbox state persists across tab switches because it lives in the parent layout, not the child component.
- **Render time** — each component records `Date.now()` on mount (via `useRef` in `useEffect`) and computes elapsed time when `onLiveboardRendered` fires. Displayed as a badge inline with the `<h2>` in the banner.

## What to observe

1. Enable the custom loader checkbox, then switch tabs — the overlay appears on each navigation until that board finishes rendering.
2. The render time resets on every tab switch, reflecting how fast the shell can swap boards.
3. Compare the time here against the Normal Liveboard example to see the shell-reuse benefit.
