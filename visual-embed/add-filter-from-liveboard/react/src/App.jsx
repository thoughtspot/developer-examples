import { useCallback, useEffect, useRef, useState } from "react";
import {
  init,
  LiveboardEmbed,
  useEmbedRef,
  AuthType,
  EmbedEvent,
  HostEvent,
} from "@thoughtspot/visual-embed-sdk/react";

const LIVEBOARD_ID = import.meta.env.VITE_LIVEBOARD_ID;

const FRAME_PARAMS = { width: "100%", height: "100%" };

// To avoid flashes
const MIN_LOADER_VISIBLE_MS = 400;

// Pre-26.8 fallback — see the caveat above the effect that listens for
// "Subscribed" below.
const OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS = 1000;

// Called at module load, not via the `useInit` hook — `useInit` calls `init()`
// from a `useEffect`, but React commits a child's effects before its parent's,
// so `<LiveboardEmbed>` would construct itself (needing the host already
// configured) before that effect ever ran, throwing "Error parsing
// ThoughtSpot host".
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
});

export default function App() {
  const embedRef = useEmbedRef();
  const loaderShownAtRef = useRef(0);
  const isOpenAddFilterModalSubscribedRef = useRef(false);

  const [isLiveboardReady, setIsLiveboardReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loader, setLoader] = useState({ visible: false, message: "" });

  const handleLiveboardRendered = useCallback(() => {
    setIsLiveboardReady(true);
  }, []);

  const showLoader = useCallback((message) => {
    setLoader((prev) => {
      if (!prev.visible) {
        loaderShownAtRef.current = Date.now();
      }
      return { visible: true, message };
    });
  }, []);

  const hideLoader = useCallback(async () => {
    const remaining =
      MIN_LOADER_VISIBLE_MS - (Date.now() - loaderShownAtRef.current);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    setLoader({ visible: false, message: "" });
  }, []);

  // Docs: https://developers.thoughtspot.com/docs/Class_LiveboardEmbed#_subscribedevent
  //       https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_subscribed
  //       https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_cancel
  //
  // On 26.10+, "Subscribed" fires each time the embedded app (re-)registers
  // a handler for OpenAddFilterModal, so `isOpenAddFilterModalSubscribedRef`
  // is reset on EmbedEvent.Cancel and set again the next time Edit mode is
  // entered and the handler re-registers.
  //
  // Caveat (pre-26.8): Subscribed is memoized and only ever fires once per
  // embed lifetime, so it won't refire after a Cancel. handleAddFilterClick's
  // fallback below covers that case.
  useEffect(() => {
    const embed = embedRef.current;
    const subscribedEventName = embed.subscribedEvent(
      HostEvent.OpenAddFilterModal,
    );
    const onSubscribed = () => {
      isOpenAddFilterModalSubscribedRef.current = true;
    };
    const onCancel = () => {
      isOpenAddFilterModalSubscribedRef.current = false;
    };
    embed.on(subscribedEventName, onSubscribed);
    embed.on(EmbedEvent.Cancel, onCancel);
    return () => {
      embed.off(subscribedEventName, onSubscribed);
      embed.off(EmbedEvent.Cancel, onCancel);
    };
  }, [embedRef]);

  const handleAddFilterClick = useCallback(async () => {
    if (isTransitioning || !isLiveboardReady) {
      return;
    }

    setIsTransitioning(true);
    showLoader("Switching to edit mode…");

    try {
      // Docs: https://developers.thoughtspot.com/docs/Enumeration_HostEvent#_edit
      //
      // Fire the trigger but don't await its own promise — it won't resolve
      // meaningfully for this event. See README's "Gotcha" sections for why
      // sequencing instead relies on the OpenAddFilterModal Subscribed signal.
      embedRef.current.trigger(HostEvent.Edit);

      showLoader("Opening Add Filter modal…");
      // Docs: https://developers.thoughtspot.com/docs/Enumeration_HostEvent#_openaddfiltermodal
      if (isOpenAddFilterModalSubscribedRef.current) {
        embedRef.current.trigger(HostEvent.OpenAddFilterModal);
      } else {
        // Pre-26.8 fallback — see the caveat in the effect above.
        await new Promise((resolve) =>
          setTimeout(resolve, OPEN_ADD_FILTER_MODAL_FALLBACK_TIMEOUT_MS),
        );
        isOpenAddFilterModalSubscribedRef.current = true;
        embedRef.current.trigger(HostEvent.OpenAddFilterModal);
      }
    } finally {
      await hideLoader();
      setIsTransitioning(false);
    }
  }, [isTransitioning, isLiveboardReady, showLoader, hideLoader, embedRef]);

  return (
    <>
      <header>
        <h1>Liveboard Embed — Add Filter Demo</h1>
        <button
          id="addFilterBtn"
          disabled={!isLiveboardReady || isTransitioning}
          onClick={handleAddFilterClick}
        >
          Add Filter
        </button>
      </header>
      <div id="layout">
        <div id="embed-wrapper">
          <LiveboardEmbed
            ref={embedRef}
            className="ts-embed"
            liveboardId={LIVEBOARD_ID}
            frameParams={FRAME_PARAMS}
            isScopedLiveboardFilteringEnabled
            // Docs: https://developers.thoughtspot.com/docs/Enumeration_EmbedEvent#_liveboardrendered
            onLiveboardRendered={handleLiveboardRendered}
          />
          <div id="embed-loader" hidden={!loader.visible}>
            <div className="spinner" />
            <span id="embed-loader-text">{loader.message}</span>
          </div>
        </div>
      </div>
    </>
  );
}
