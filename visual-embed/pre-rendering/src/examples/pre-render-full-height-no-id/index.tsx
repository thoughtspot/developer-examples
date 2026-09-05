import { useState, useEffect, useRef } from "react";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import { useOutletContext } from "react-router";
import type { LoaderContext } from "../../App";

export const Liveboard1 = () => {
  const { showLoader } = useOutletContext<LoaderContext>();
  const [loaded, setLoaded] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    setLoaded(false);
    setRenderTime(null);
  }, []);

  return (
    <div className="full-height-example">
      <div className="full-height-banner">
        <div className="banner-title-row">
          <h2>Liveboard 1 — Full Height</h2>
          {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        </div>
        <p>Pre-rendered without a specific ID. The shell is reused across liveboards.</p>
      </div>
      <div className="liveboard-wrapper">
        {showLoader && !loaded && (
          <div className="custom-loader">
            <div className="loader-spinner" />
            <p>Loading liveboard...</p>
          </div>
        )}
        <LiveboardEmbed
          preRenderId="pre-render-full-height-no-id"
          liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
          fullHeight
          onLiveboardRendered={() => {
            setLoaded(true);
            setRenderTime(Date.now() - mountTime.current);
          }}
        />
      </div>
      <div className="full-height-footer">
        <p>With <code>fullHeight</code> the iframe expands to fit every tile.</p>
      </div>
    </div>
  );
};

export const Liveboard2 = () => {
  const { showLoader } = useOutletContext<LoaderContext>();
  const [loaded, setLoaded] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    setLoaded(false);
    setRenderTime(null);
  }, []);

  return (
    <div className="full-height-example">
      <div className="full-height-banner">
        <div className="banner-title-row">
          <h2>Liveboard 2 — Full Height</h2>
          {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        </div>
        <p>Same pre-render shell reused for a different liveboard.</p>
      </div>
      <div className="liveboard-wrapper">
        {showLoader && !loaded && (
          <div className="custom-loader">
            <div className="loader-spinner" />
            <p>Loading liveboard...</p>
          </div>
        )}
        <LiveboardEmbed
          preRenderId="pre-render-full-height-no-id"
          liveboardId="b504e160-3025-4508-a76a-1beb1f4b5eed"
          fullHeight
          onLiveboardRendered={() => {
            setLoaded(true);
            setRenderTime(Date.now() - mountTime.current);
          }}
        />
      </div>
      <div className="full-height-footer">
        <p>Both liveboards share one pre-render shell — one background iframe, two liveboards.</p>
      </div>
    </div>
  );
};
