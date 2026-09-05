import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

const PreRenderWithFullHeight = () => (
  <div className="full-height-example">
    <div className="full-height-banner">
      <h2>Pre-Render + Full Height</h2>
      <p>The embed expands to match the full height of the liveboard content.</p>
    </div>
    <LiveboardEmbed
      preRenderId="pre-render-full-height"
      liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
      fullHeight
    />
    <div className="full-height-footer">
      <p>This content sits below the liveboard. With <code>fullHeight</code> the embed grows to fit all tiles.</p>
    </div>
  </div>
);

export default PreRenderWithFullHeight;
