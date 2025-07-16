import { AuthType, init, LogLevel } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import { useState } from "react";
import "./App.css";

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
  logLevel: LogLevel.DEBUG, 
});

function App() {
  const [lazyLoadingMargin, setLazyLoadingMargin] = useState<string>("0px");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Liveboard Lazy Loading vs Regular Loading Demo</h1>
        <p>
          Compare the performance difference between regular and lazy loading.
        </p>
      </header>

      <div className="main-container">
        <div className="code-section">
          <div className="code-block-container">
            <div className="code-title">Regular Loading</div>
            <pre className="code-block">{`<LiveboardEmbed
  liveboardId="${import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}"
  fullHeight={true}
/>`}</pre>
          </div>
          <div className="code-block-container">
            <div className="code-title">With Lazy Loading</div>
            <pre className="code-block">
              {`<LiveboardEmbed
  liveboardId="${import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}"
  fullHeight={true}
  `}
              <span className="highlight-prop">
                {`lazyLoadingForFullHeight={true}`}
              </span>
              {lazyLoadingMargin && `\n  `}
              {lazyLoadingMargin && (
                <span className="highlight-prop">
                  {`lazyLoadingMargin="${lazyLoadingMargin}"`}
                </span>
              )}
              {`
/>`}
            </pre>
          </div>
        </div>

        <div className="embed-container">
          <div id="ts-embed-1" className="embed-wrapper">
            <LiveboardEmbed
              liveboardId={import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}
              vizId={import.meta.env.VITE_THOUGHTSPOT_VIZ_ID}
              fullHeight={true}
              // lazyLoadingForFullHeight={true}
            />
          </div>
          <div id="ts-embed-2" className="embed-wrapper">
            <div className="input-container">
              <div className="input-group">
                <label htmlFor="lazy-margin-input" className="input-label">
                  Lazy Loading Margin:
                </label>
                <input
                  id="lazy-margin-input"
                  type="text"
                  value={lazyLoadingMargin}
                  onChange={(e) => setLazyLoadingMargin(e.target.value)}
                  placeholder="Enter margin value (e.g., 100px, 50%, etc.)"
                  className="input-field"
                />
              </div>
            </div>
            <LiveboardEmbed
              liveboardId={import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}
              vizId={import.meta.env.VITE_THOUGHTSPOT_VIZ_ID}
              fullHeight={true}
              lazyLoadingForFullHeight={true}
              lazyLoadingMargin={lazyLoadingMargin}
              additionalFlags={{
                sdkVersion: "1.19.0",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
