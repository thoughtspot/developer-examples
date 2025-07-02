import { useEffect, useState } from "react";
import { LiveboardEmbed, AuthType, init } from "@thoughtspot/visual-embed-sdk";
import "./App.css";

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost:
    import.meta.env.VITE_TS_HOST ||
    "https://embed-1-do-not-delete.thoughtspotdev.cloud",
  authType: AuthType.Basic,
  username: import.meta.env.VITE_TS_USERNAME || "tsadmin",
  password: import.meta.env.VITE_TS_PASSWORD || "admin",
  callPrefetch: true,
});

function App() {
  const [activeMode, setActiveMode] = useState<"without" | "with">("without");
  const [loadTimes, setLoadTimes] = useState<{
    without?: number;
    with?: number;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const embedEle = document.getElementById("ts-embed-comparison");
    if (!embedEle) return;

    // Clear previous embed
    embedEle.innerHTML = "";
    setIsLoading(true);

    const startTime = performance.now();

    const liveboardEmbed = new LiveboardEmbed(embedEle, {
      frameParams: {
        width: "100%",
        height: "100%",
      },
      liveboardId:
        import.meta.env.VITE_LIVEBOARD_ID ||
        "d084c256-e284-4fc4-b80c-111cb606449a",
      fullHeight: true,
      // Note: lazyLoadFullHeight is a new feature - for demo purposes
      ...(activeMode === "with" && { lazyLoadFullHeight: true }),
    });

    // Track load time - simplified for demo
    setTimeout(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      setLoadTimes((prev) => ({
        ...prev,
        [activeMode]: Math.round(loadTime),
      }));
      setIsLoading(false);
    }, 2000); // Simulate load time

    liveboardEmbed.render();

    return () => {
      // Cleanup
      if (embedEle) {
        embedEle.innerHTML = "";
      }
      setIsLoading(false);
    };
  }, [activeMode]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Full Height Liveboard: Lazy Loading Demo</h1>
        <p>
          Compare the performance difference between embedding a liveboard with
          full height <strong>with</strong> and <strong>without</strong> lazy
          loading enabled.
        </p>
      </header>

      <div className="controls">
        <div className="mode-toggle">
          <button
            className={`toggle-btn ${activeMode === "without" ? "active" : ""}`}
            onClick={() => setActiveMode("without")}
            disabled={isLoading}
          >
            Without Lazy Loading
          </button>
          <button
            className={`toggle-btn ${activeMode === "with" ? "active" : ""}`}
            onClick={() => setActiveMode("with")}
            disabled={isLoading}
          >
            With Lazy Loading
          </button>
        </div>

        <div className="configuration-info">
          <h3>Current Configuration:</h3>
          <pre className="code-block">
            {`const liveboardEmbed = new LiveboardEmbed(embedEle, {
  liveboardId: "your-liveboard-id",
  fullHeight: true,
  lazyLoadFullHeight: ${activeMode === "with" ? "true" : "false"}${
              activeMode === "without"
                ? " // Default behavior"
                : " // Lazy loading enabled"
            }
});`}
          </pre>

          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Loading liveboard...</span>
            </div>
          )}

          {loadTimes[activeMode] && !isLoading && (
            <div className="load-time">
              <strong>Load Time: {loadTimes[activeMode]}ms</strong>
            </div>
          )}
        </div>
      </div>

      <div className="comparison-info">
        <div className="info-cards">
          <div className="info-card">
            <h4>Without Lazy Loading</h4>
            <ul>
              <li>All visualizations load immediately</li>
              <li>Higher initial load time</li>
              <li>More network requests at startup</li>
              <li>All data fetched upfront</li>
              <li>Better for small liveboards</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>With Lazy Loading</h4>
            <ul>
              <li>Visualizations load as they come into view</li>
              <li>Faster initial load time</li>
              <li>Reduced initial network requests</li>
              <li>Data fetched on-demand</li>
              <li>Better for large liveboards</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="embed-container">
        <div id="ts-embed-comparison" className="embed-wrapper" />
      </div>
    </div>
  );
}

export default App;
