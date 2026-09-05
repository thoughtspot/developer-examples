import { useState, useEffect, useRef, useCallback } from "react";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

const NormalEmbed = () => {
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
  }, []);
  const updateTime = useCallback(() => {
    setRenderTime(Date.now() - mountTime.current)
  }, []);

  return (
    <div className="liveboard-example">
      <div className="full-height-banner">
        <div className="banner-title-row">
          <h2>Normal Embed</h2>
          {renderTime !== null && <span className="render-time">Loaded in {(renderTime / 1000).toFixed(2)}s</span>}
        </div>
        <p>No pre-rendering — ThoughtSpot loads fresh on every visit.</p>
      </div>
      <LiveboardEmbed
        className="embed-div"
        liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
        onLiveboardRendered={updateTime}
      />
      <div className="liveboard-footer">
        <span>Navigate away and back to see the full reload cost each time.</span>
      </div>
    </div>
  );
};

export default NormalEmbed;
