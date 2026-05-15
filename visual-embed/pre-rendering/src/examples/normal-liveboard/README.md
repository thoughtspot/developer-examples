# Normal Liveboard

**Route:** `/normal-liveboard`

Identical behaviour to the Normal Embed example but embeds a different liveboard. Useful as a second cold-load baseline when comparing against the pre-render examples that also target two boards.

## How it works

```tsx
<LiveboardEmbed
  liveboardId="..."
  className="embed-div"
  onLiveboardRendered={() => setRenderTime(Date.now() - mountTime.current)}
/>
```

- Same render-time measurement pattern as the Normal Embed: `mountTime` ref reset in `useEffect`, `onLiveboardRendered` records elapsed time.
- No `preRenderId` — every visit is a cold load.

## Key prop

| Prop | Value |
|---|---|
| `liveboardId` | Different board ID from Normal Embed |

## What to observe

Compare the load time here against Pre-Render Without Liveboard ID (Liveboard 2), which uses the same board but pre-renders the shell in advance.
