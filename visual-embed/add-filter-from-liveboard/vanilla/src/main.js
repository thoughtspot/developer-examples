import {
  init,
  AuthType,
  LiveboardEmbed,
  EmbedEvent,
  HostEvent,
} from "@thoughtspot/visual-embed-sdk";

const LIVEBOARD_ID = import.meta.env.VITE_LIVEBOARD_ID;

const addFilterBtn = document.getElementById("addFilterBtn");
const embedLoaderEl = document.getElementById("embed-loader");
const embedLoaderTextEl = document.getElementById("embed-loader-text");

// To avoid flashes
const MIN_LOADER_VISIBLE_MS = 400;
let loaderShownAt = 0;

function showLoader(message) {
  embedLoaderTextEl.textContent = message;
  if (embedLoaderEl.hidden) {
    loaderShownAt = Date.now();
  }
  embedLoaderEl.hidden = false;
}

async function hideLoader() {
  const remaining = MIN_LOADER_VISIBLE_MS - (Date.now() - loaderShownAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  embedLoaderEl.hidden = true;
}

// Docs: https://developers.thoughtspot.com/docs/Class_LiveboardEmbed#_subscribedevent
//       https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_subscribed
//
// On 26.10+, "Subscribed" fires each time the embedded app (re-)registers a
// handler for OpenAddFilterModal, so `isOpenAddFilterModalSubscribed` is
// reset on EmbedEvent.Cancel and set again the next time Edit mode is
// entered and the handler re-registers.
//
// Caveat (pre-26.8): Subscribed is memoized and only ever fires once per
// embed lifetime, so it won't refire after a Cancel. OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS
// covers that: if the flag hasn't flipped back to true shortly after Edit,
// trigger OpenAddFilterModal anyway instead of waiting on a signal that will
// never come.
const OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS = 1000;

init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
});

const liveboardEmbed = new LiveboardEmbed(document.getElementById("ts-embed"), {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: LIVEBOARD_ID,
  isScopedLiveboardFilteringEnabled: true,
});

// Guards against two race conditions in this flow:
// 1. isTransitioning: blocks re-entrant clicks so a second click can't fire
//    Edit/OpenAddFilterModal while the first sequence is still in flight.
// 2. isLiveboardReady: blocks clicks before the embed has a handler
//    registered to receive host events at all.
let isTransitioning = false;
let isLiveboardReady = false;

// Docs: https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_liveboardrendered
liveboardEmbed.on(EmbedEvent.LiveboardRendered, () => {
  isLiveboardReady = true;
  addFilterBtn.disabled = false;
});

// Attached once, right at startup — not inside the click handler — so we
// never risk starting to listen after "Subscribed" has already fired.
let isOpenAddFilterModalSubscribed = false;
liveboardEmbed.on(
  liveboardEmbed.subscribedEvent(HostEvent.OpenAddFilterModal),
  () => {
    isOpenAddFilterModalSubscribed = true;
  },
);
// Docs: https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_cancel
liveboardEmbed.on(EmbedEvent.Cancel, () => {
  isOpenAddFilterModalSubscribed = false;
});

addFilterBtn.addEventListener("click", async () => {
  if (isTransitioning || !isLiveboardReady) {
    return;
  }

  isTransitioning = true;
  addFilterBtn.disabled = true;
  showLoader("Switching to edit mode…");

  try {
    // Docs: https://developers.thoughtspot.com/docs/Enumeration_HostEvent#_edit
    //
    // Fire the trigger but don't await its own promise — it won't resolve
    // meaningfully for this event. EmbedEvent.Edit is what actually confirms
    // edit mode was entered.
    liveboardEmbed.trigger(HostEvent.Edit);

    showLoader("Opening Add Filter modal…");
    // Docs: https://developers.thoughtspot.com/docs/Enumeration_HostEvent#_openaddfiltermodal
    if (isOpenAddFilterModalSubscribed) {
      liveboardEmbed.trigger(HostEvent.OpenAddFilterModal);
    } else {
      // Pre-26.8 fallback — see the caveat above OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS.
      await new Promise((resolve) =>
        setTimeout(resolve, OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS),
      );
      isOpenAddFilterModalSubscribed = true;
      liveboardEmbed.trigger(HostEvent.OpenAddFilterModal);
    }
  } finally {
    await hideLoader();
    isTransitioning = false;
    addFilterBtn.disabled = false;
  }
});

liveboardEmbed.render();
