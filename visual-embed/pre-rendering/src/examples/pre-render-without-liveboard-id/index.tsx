import { useState, useEffect, useRef } from "react";
import { LiveboardEmbed, Action } from "@thoughtspot/visual-embed-sdk/react";
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
    <div className="liveboard-example">
      <div className="liveboard-wrapper">
        {showLoader && !loaded && (
          <div className="custom-loader">
            <div className="loader-spinner" />
            <p>Loading liveboard...</p>
          </div>
        )}
        <LiveboardEmbed
          preRenderId="pre-render-without-liveboard-id"
          liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
          className="embed-div"
          hiddenActions={[Action.Share, Action.Present]}
          customizations={{
            style: {
              customCSS: {
                variables: {
                  "--ts-var-root-color": "#1976D2",
                  "--ts-var-button--secondary-color": "#1565C0",
                  "--ts-var-button--secondary--font-color": "#ffffff",
                  "--ts-var-root-background": "#0a1929",
                },
              },
            },
          }}
          onLiveboardRendered={() => {
            setLoaded(true);
            setRenderTime(Date.now() - mountTime.current);
          }}
        />
      </div>
      <div className="liveboard-footer">
        {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        <span><strong>hiddenActions:</strong> Share, Present</span>
        <span><strong>customizations:</strong> Blue accent — <code>--ts-var-root-color: #1976D2</code> · background <code>--ts-var-root-background: #0a1929</code></span>
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
    <div className="liveboard-example">
      <div className="liveboard-wrapper">
        {showLoader && !loaded && (
          <div className="custom-loader">
            <div className="loader-spinner" />
            <p>Loading liveboard...</p>
          </div>
        )}
        <LiveboardEmbed
          preRenderId="pre-render-without-liveboard-id"
          liveboardId="b504e160-3025-4508-a76a-1beb1f4b5eed"
          className="embed-div"
          hiddenActions={[Action.Edit, Action.DownloadAsCsv]}
          customizations={{
            style: {
              customCSS: {
                variables: {
                  "--ts-var-root-color": "#7B1FA2",
                  "--ts-var-button--secondary-color": "#6A1B9A",
                  "--ts-var-button--secondary--font-color": "#ffffff",
                  "--ts-var-root-background": "#1a0a2e",
                },
              },
            },
          }}
          onLiveboardRendered={() => {
            setLoaded(true);
            setRenderTime(Date.now() - mountTime.current);
          }}
        />
      </div>
      <div className="liveboard-footer">
        {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        <span><strong>hiddenActions:</strong> Edit, Download as CSV</span>
        <span><strong>customizations:</strong> Purple accent — <code>--ts-var-root-color: #7B1FA2</code> · background <code>--ts-var-root-background: #1a0a2e</code></span>
      </div>
    </div>
  );
};
