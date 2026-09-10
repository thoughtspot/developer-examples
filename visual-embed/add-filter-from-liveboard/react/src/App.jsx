import { useCallback, useEffect, useRef, useState } from "react";
import {
  init,
  LiveboardEmbed,
  useEmbedRef,
  AuthType,
  HostEvent,
} from "@thoughtspot/visual-embed-sdk/react";

const THOUGHTSPOT_HOST = "http://localhost:5001";
const LIVEBOARD_ID = "9bd202f5-d431-44bf-9a07-b4f7be372125";

const FRAME_PARAMS = { width: "100%", height: "100%" };

// To avoid flashes
const MIN_LOADER_VISIBLE_MS = 400;

// Called at module load, not via the `useInit` hook — `useInit` calls `init()`
// from a `useEffect`, but React commits a child's effects before its parent's,
// so `<LiveboardEmbed>` would construct itself (needing the host already
// configured) before that effect ever ran, throwing "Error parsing
// ThoughtSpot host".
init({
  thoughtSpotHost: THOUGHTSPOT_HOST,
  authType: AuthType.None,
});

export default function App() {
  const embedRef = useEmbedRef();
  const loaderShownAtRef = useRef(0);
  const isOpenAddFilterModalReadyRef = useRef(false);

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
  //
  // "Subscribed" fires once, the instant the embedded app registers a handler
  // for this host event — then never again. If that already happened before
  // we start listening, we'd wait forever. So `isOpenAddFilterModalReadyRef`
  // is set by a listener attached from mount (see the effect below), which
  // can never miss it; we check that flag first, and only listen live if
  // it's still false.
  const waitForReady = useCallback(
    (hostEvent, readyFlagRef) => {
      if (readyFlagRef.current) {
        return Promise.resolve();
      }

      const embed = embedRef.current;
      const subscribedEventName = embed.subscribedEvent(hostEvent);
      return new Promise((resolve) => {
        embed.on(subscribedEventName, function onSubscribed() {
          embed.off(subscribedEventName, onSubscribed);
          resolve();
        });
      });
    },
    [embedRef],
  );

  const triggerOnceReady = useCallback(
    async (hostEvent, readyFlagRef) => {
      await waitForReady(hostEvent, readyFlagRef);
      embedRef.current.trigger(hostEvent);
    },
    [waitForReady, embedRef],
  );

  // Attached once, right on mount — not inside the click handler — so we
  // never risk starting to listen after this one-time "handler registered"
  // signal has already fired. That's what lets triggerOnceReady know for
  // certain, at click time, whether OpenAddFilterModal is ready yet.
  useEffect(() => {
    const embed = embedRef.current;
    const subscribedEventName = embed.subscribedEvent(
      HostEvent.OpenAddFilterModal,
    );
    const onSubscribed = () => {
      isOpenAddFilterModalReadyRef.current = true;
    };
    embed.on(subscribedEventName, onSubscribed);
    return () => embed.off(subscribedEventName, onSubscribed);
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
      await triggerOnceReady(
        HostEvent.OpenAddFilterModal,
        isOpenAddFilterModalReadyRef,
      );
    } finally {
      await hideLoader();
      setIsTransitioning(false);
    }
  }, [
    isTransitioning,
    isLiveboardReady,
    showLoader,
    hideLoader,
    triggerOnceReady,
    embedRef,
  ]);

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
