# Pre-Render Embed

**Routes:** `/pre-render/home` · `/pre-render/liveboard`

Demonstrates the core pre-rendering pattern. The liveboard starts loading in the background as soon as you land on the Home tab. Switching to the Liveboard tab connects to the already-running iframe — no restart.

## How it works

### Home tab — starts pre-rendering (`PreRenderHome`)

```tsx
<PreRenderedLiveboardEmbed
  preRenderId="pre-render"
  liveboardId="..."
/>
```

`PreRenderedLiveboardEmbed` tells the SDK to create a hidden iframe in `<body>` and begin loading the liveboard immediately. The iframe is identified by `preRenderId`.

### Liveboard tab — connects to the shell

```tsx
<LiveboardEmbed
  preRenderId="pre-render"
  liveboardId="..."
  className="embed-div"
/>
```

When `preRenderId` is present and matches an active shell, the SDK moves the existing iframe into this component's DOM position instead of creating a new one. The board appears instantly.

## Key props

| Prop | Where | Purpose |
|---|---|---|
| `preRenderId` | Both | Links the shell to its consumer — must match exactly |
| `liveboardId` | Both | The board to load; set on both ends |

## What to observe

1. Open Home — watch the event log and status badge while the board loads silently.
2. Once the badge turns green, switch to Liveboard. It appears immediately.
3. Switch back to Home and then to Liveboard again — still instant, the shell is still alive.
