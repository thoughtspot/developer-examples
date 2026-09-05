# Normal Embed

**Route:** `/normal`

A plain `LiveboardEmbed` with no pre-rendering. ThoughtSpot initialises a fresh iframe on every visit — there is no cached state between navigations.

## How it works

```tsx
<LiveboardEmbed
  liveboardId="..."
  className="embed-div"
  onLiveboardRendered={() => setRenderTime(Date.now() - mountTime.current)}
/>
```

- `mountTime` is captured in a `useRef` inside `useEffect` so it resets on every mount.
- `onLiveboardRendered` fires once the SDK signals the liveboard is visible. The difference between those two timestamps is the cold-load time shown in the header badge.
- No `preRenderId` — the SDK creates and destroys the iframe on each mount/unmount.

## Key prop

| Prop | Value |
|---|---|
| `liveboardId` | Fixed board ID |

## What to observe

Navigate away and back. The render time resets and climbs again each time, showing the full cost of a cold load. Compare this against any pre-render example to see the difference.
