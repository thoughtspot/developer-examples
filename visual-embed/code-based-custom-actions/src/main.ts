import './style.css';
import {
  init,
  AuthType,
  LiveboardEmbed,
  EmbedEvent,
  CustomActionsPosition,
  CustomActionTarget,
  type LiveboardViewConfig,
  type MessagePayload,
  type CustomActionPayload,
} from '@thoughtspot/visual-embed-sdk';

/**
 * Code-based custom actions
 * -------------------------
 * A *code-based* custom action is a menu item you define entirely in your
 * application code via the Visual Embed SDK — no configuration in the
 * ThoughtSpot UI required. This is the recommended (default) way to add custom
 * actions: it is version-controlled, portable across Orgs, and lets you decide
 * exactly WHERE the action appears (`position`) and WHAT it applies to
 * (`target`).
 *
 * You declare them with the `customActions` array (available on `init()`
 * globally, or per-embed in the view-config), then handle clicks by listening
 * for `EmbedEvent.CustomAction`.
 *
 *   position: CustomActionsPosition
 *     PRIMARY     -> a primary button in the toolbar
 *     MENU        -> inside the "..." more-options menu
 *     CONTEXTMENU -> the right-click context menu (Answer / visualization)
 *
 *   target: CustomActionTarget
 *     LIVEBOARD | VIZ | ANSWER | SPOTTER
 *
 * Requires SDK >= 1.43.0 and ThoughtSpot >= 10.14.0.cl.
 */

// 1. Initialize the SDK once.
//    NOTE: AuthType.Basic with username/password is for DEMO only.
//    In production use trusted auth or SSO — never ship credentials to the browser.
init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_TS_USERNAME,
  password: import.meta.env.VITE_TS_PASSWORD,
});

// 2. Lay out the page first so the embed container exists in the DOM.
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <h1>ThoughtSpot Code-Based Custom Actions</h1>
    <p>
      Custom actions defined entirely in code via <code>customActions</code>.
      Click <strong>Export to CRM</strong> in the toolbar, <strong>Send to Slack</strong>
      from a visualization's <code>...</code> menu, or right-click a data point for
      <strong>Open support ticket</strong>.
    </p>
  </header>
  <div class="layout">
    <div id="ts-embed" class="embed"></div>
    <aside class="log">
      <h2>Custom action events</h2>
      <div id="log-list" class="log-list">
        <p class="empty">No events yet — trigger a custom action above.</p>
      </div>
    </aside>
  </div>
`;

// 3. Declare the custom actions in code.
const viewConfig: LiveboardViewConfig = {
  frameParams: { width: '100%', height: '100%' },
  liveboardId: import.meta.env.VITE_LIVEBOARD_ID,
  customActions: [
    {
      // Primary toolbar button on the Liveboard.
      id: 'export-to-crm',
      name: 'Export to CRM',
      position: CustomActionsPosition.PRIMARY,
      target: CustomActionTarget.LIVEBOARD,
    },
    {
      // Inside the "..." menu of an individual visualization.
      id: 'send-to-slack',
      name: 'Send to Slack',
      position: CustomActionsPosition.MENU,
      target: CustomActionTarget.VIZ,
    },
    {
      // Right-click context menu on a data point within a visualization.
      id: 'open-ticket',
      name: 'Open support ticket',
      position: CustomActionsPosition.CONTEXTMENU,
      target: CustomActionTarget.VIZ,
    },
  ],
};

// 4. Render the embed.
const container = document.getElementById('ts-embed')!;
const embed = new LiveboardEmbed(container, viewConfig);

// 5. Handle clicks. The payload carries the action `id` plus the data context
//    of whatever the user clicked (columns, selected points, etc.).
embed.on(EmbedEvent.CustomAction, (payload: MessagePayload) => {
  // For a code-based custom action, `payload.data` carries the action `id`
  // alongside the CustomActionPayload data context (embedAnswerData,
  // contextMenuPoints, session, ...).
  const data = payload.data as CustomActionPayload & { id: string };
  const actionId = data.id;
  logEvent(actionId, data);

  switch (actionId) {
    case 'export-to-crm':
      // e.g. POST the Liveboard context to your CRM.
      break;
    case 'send-to-slack':
      // e.g. call your backend to post the viz to a Slack channel.
      break;
    case 'open-ticket':
      // e.g. open a modal / navigate to your ticketing system with the
      //      clicked data point pre-filled.
      break;
    default:
      // Not one of our custom actions — ignore.
      break;
  }
});

embed.on(EmbedEvent.Error, (e: unknown) => console.error('Embed error:', e));

embed.render();

// --- helpers: visualize which action fired and the payload it carried ---
function logEvent(actionId: string | undefined, detail: CustomActionPayload): void {
  const list = document.getElementById('log-list');
  if (!list) return;
  list.querySelector('.empty')?.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-id">${actionId ?? '(unknown)'}</div>
    <pre>${escapeHtml(JSON.stringify(detail, null, 2))}</pre>
  `;
  list.prepend(entry);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
