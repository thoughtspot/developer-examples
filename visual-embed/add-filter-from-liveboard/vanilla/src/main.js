import {
  init,
  AuthType,
  LiveboardEmbed,
  EmbedEvent,
  HostEvent,
} from "@thoughtspot/visual-embed-sdk";

const THOUGHTSPOT_HOST = "http://localhost:5001";
const LIVEBOARD_ID = "9bd202f5-d431-44bf-9a07-b4f7be372125";

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
// "Subscribed" fires once, the instant the embedded app registers a handler
// for this host event — then never again. If that already happened before
// we start listening, we'd wait forever. So `readyFlag` is set by a listener
// attached from page load (see isOpenAddFilterModalReady below), which can
// never miss it; we check that flag first, and only listen live if it's
// still false.
function waitForReady(embed, hostEvent, readyFlag) {
  if (readyFlag.current) {
    return Promise.resolve();
  }

  const subscribedEventName = embed.subscribedEvent(hostEvent);
  return new Promise((resolve) => {
    embed.on(subscribedEventName, function onSubscribed() {
      embed.off(subscribedEventName, onSubscribed);
      resolve();
    });
  });
}

async function triggerOnceReady(embed, hostEvent, readyFlag) {
  await waitForReady(embed, hostEvent, readyFlag);
  embed.trigger(hostEvent);
}

init({
  thoughtSpotHost: THOUGHTSPOT_HOST,
  authType: AuthType.None,
});

const liveboardEmbed = new LiveboardEmbed(document.getElementById("ts-embed"), {
  frameParams: { width: "100%", height: "100%" },
  liveboardId: LIVEBOARD_ID,
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
// never risk starting to listen after this one-time "handler registered"
// signal has already fired. That's what lets triggerOnceReady know for
// certain, at click time, whether OpenAddFilterModal is ready yet.
const isOpenAddFilterModalReady = { current: false };
liveboardEmbed.on(
  liveboardEmbed.subscribedEvent(HostEvent.OpenAddFilterModal),
  () => {
    isOpenAddFilterModalReady.current = true;
  },
);

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
    await triggerOnceReady(
      liveboardEmbed,
      HostEvent.OpenAddFilterModal,
      isOpenAddFilterModalReady,
    );
  } finally {
    await hideLoader();
    isTransitioning = false;
    addFilterBtn.disabled = false;
  }
});

liveboardEmbed.render();
