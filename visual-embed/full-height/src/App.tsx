import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import "./App.css";

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost:
    import.meta.env.VITE_THOUGHTSPOT_HOST ||
    "https://training.thoughtspot.cloud",
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME || "code-sandbox",
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD || "3mbed+#3xplz",
});

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Full Height Liveboard Comparison</h1>
        <p>
          Compare the performance difference between regular and lazy loading.
        </p>
      </header>

      <div className="main-container">
        <div className="code-section">
          <pre className="code-block">
            {`// Regular Loading
<LiveboardEmbed
  liveboardId="${import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}"
  vizId="${import.meta.env.VITE_THOUGHTSPOT_VIZ_ID}"
  fullHeight={true}
/>`}
          </pre>
          <pre className="code-block">
            {`// With Lazy Loading
<LiveboardEmbed
  liveboardId="${import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID}"
  vizId="${import.meta.env.VITE_THOUGHTSPOT_VIZ_ID}"
  fullHeight={true}
  lazyLoadingForFullHeight={true}
/>`}
          </pre>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
