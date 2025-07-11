import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import "./App.css";

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
});

function App() {
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
            <LiveboardEmbed
              liveboardId={import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}
              vizId={import.meta.env.VITE_THOUGHTSPOT_VIZ_ID}
              fullHeight={true}
              lazyLoadingForFullHeight={true}
              additionalFlags={{
                rootMarginForLazyLoad: "0px 0px 0px 0px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
