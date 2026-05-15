import { useState, useEffect, useRef } from "react";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

const NormalLiveboardEmbed = () => {
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
  }, []);

  return (
    <div className="liveboard-example">
      <div className="full-height-banner">
        <div className="banner-title-row">
          <h2>Normal Liveboard</h2>
          {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        </div>
        <p>No pre-rendering — ThoughtSpot loads fresh on every visit.</p>
      </div>
      <LiveboardEmbed
        className="embed-div"
        liveboardId="b504e160-3025-4508-a76a-1beb1f4b5eed"
        onLiveboardRendered={() => setRenderTime(Date.now() - mountTime.current)}
      />
      <div className="liveboard-footer">
        <span>Navigate away and back to see the full reload cost each time.</span>
      </div>
    </div>
  );
};

export default NormalLiveboardEmbed;
