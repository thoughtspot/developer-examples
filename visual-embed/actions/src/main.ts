import './style.css';
import {
  init,
  AuthType,
  Action,
  LiveboardEmbed,
  EmbedEvent,
  type LiveboardViewConfig,
} from '@thoughtspot/visual-embed-sdk';

/**
 * ThoughtSpot "Actions" example
 * -----------------------------
 * Every menu command in an embedded ThoughtSpot view (Download, Share, Edit,
 * Drill down, ...) is represented by a member of the `Action` enum. You control
 * which of these show up using three mutually-aware view-config options:
 *
 *   - visibleActions  -> ALLOW-LIST. Only these actions are shown; all others
 *                        are hidden. (Cannot be combined with hiddenActions.)
 *   - hiddenActions   -> DENY-LIST.  These actions are removed from the UI
 *                        entirely. (Cannot be combined with visibleActions.)
 *   - disabledActions -> These actions stay visible but are greyed-out and
 *                        non-clickable. Pair with `disabledActionReason` for a
 *                        tooltip explaining why.
 *
 * This demo lets you flip between those modes and re-renders the Liveboard so
 * you can see the toolbar / "..." menu change live.
 */

// 1. Initialize the SDK once.
//    NOTE: AuthType.Basic with a username/password is for DEMO purposes only.
//    In production use trusted auth or SSO — never ship credentials to the browser.
init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_TS_USERNAME,
  password: import.meta.env.VITE_TS_PASSWORD,
});

const LIVEBOARD_ID = import.meta.env.VITE_LIVEBOARD_ID;

type Mode = 'all' | 'visible' | 'hidden' | 'disabled';

const MODES: { id: Mode; label: string; snippet: string }[] = [
  {
    id: 'all',
    label: 'All actions (default)',
    snippet: '// No restrictions — the full default menu is shown.',
  },
  {
    id: 'visible',
    label: 'visibleActions (allow-list)',
    snippet: `visibleActions: [
  Action.DownloadAsPdf,
  Action.Share,
  Action.DrillDown,
] // only these are shown; everything else is hidden`,
  },
  {
    id: 'hidden',
    label: 'hiddenActions (deny-list)',
    snippet: `hiddenActions: [
  Action.Share,
  Action.Edit,
  Action.Schedule,
] // these are removed from the UI entirely`,
  },
  {
    id: 'disabled',
    label: 'disabledActions (greyed-out)',
    snippet: `disabledActions: [Action.DownloadAsPdf, Action.Share],
disabledActionReason: 'Not available in this demo'
// stay visible but non-clickable`,
  },
];

// 2. Build the LiveboardEmbed view-config for the selected mode.
function buildConfig(mode: Mode): LiveboardViewConfig {
  const base: LiveboardViewConfig = {
    frameParams: { width: '100%', height: '100%' },
    liveboardId: LIVEBOARD_ID,
  };

  switch (mode) {
    case 'visible':
      return {
        ...base,
        visibleActions: [Action.DownloadAsPdf, Action.Share, Action.DrillDown],
      };
    case 'hidden':
      return {
        ...base,
        hiddenActions: [Action.Share, Action.Edit, Action.Schedule],
      };
    case 'disabled':
      return {
        ...base,
        disabledActions: [Action.DownloadAsPdf, Action.Share],
        disabledActionReason: 'Not available in this demo',
      };
    case 'all':
    default:
      return base;
  }
}

// 3. (Re)render the embedded Liveboard for a given mode.
function renderEmbed(mode: Mode): void {
  const container = document.getElementById('ts-embed');
  if (!container) return;

  // Recreate the embed so the new action config takes effect.
  container.innerHTML = '';
  const embed = new LiveboardEmbed(container, buildConfig(mode));
  embed.on(EmbedEvent.Error, (e: unknown) => console.error('Embed error:', e));
  embed.render();
}

// 4. Wire up the page: mode buttons + config preview + embed container.
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <h1>ThoughtSpot Actions</h1>
    <p>Control the built-in action menu with the <code>Action</code> enum.</p>
  </header>
  <div class="controls" id="controls">
    ${MODES.map(
      (m, i) =>
        `<button class="mode-btn${i === 0 ? ' active' : ''}" data-mode="${m.id}">${m.label}</button>`,
    ).join('')}
  </div>
  <pre class="snippet"><code id="snippet"></code></pre>
  <div id="ts-embed" class="embed"></div>
`;

const snippetEl = document.getElementById('snippet')!;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.mode-btn'));

function selectMode(mode: Mode): void {
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  snippetEl.textContent = MODES.find((m) => m.id === mode)!.snippet;
  renderEmbed(mode);
}

buttons.forEach((btn) =>
  btn.addEventListener('click', () => selectMode(btn.dataset.mode as Mode)),
);

// Initial render — show the full default menu.
selectMode('all');
