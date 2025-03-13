import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import { NormalEmbed, PreRenderEmbed, PreRenderEmbedOnDemand } from "./embeds";
import {
  PreRenderedAppEmbed,
  AuthType,
  AuthStatus,
  useInit,
} from "@thoughtspot/visual-embed-sdk/react";

const EmbedInit = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);

  const authEERef = useInit({
    thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    authType: AuthType.Basic,
    username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
    password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
  });

  useEffect(() => {
    if (authEERef.current) {
      authEERef.current.on(AuthStatus.SDK_SUCCESS, () => setLoading(false));
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="embed-init">
      {/* {Need to call this to start pre-rendering} */}
      <PreRenderedAppEmbed preRenderId="pre-render" />

      {children}
    </div>
  );
};

const Home = () => {
  return (
    <>
      <h1>ThoughtSpot Pre-Rendering</h1>
      <div className="card">
        <Link to="/normal">Normal Embed</Link>
        <p className="read-the-docs">
          Normal Render is the default behavior of the ThoughtSpot SDK. Loads
          the ThoughtSpot app when the component is rendered.
        </p>
      </div>
      <div className="card">
        <Link to="/pre-render">Pre-Render Embed</Link>
        <p className="read-the-docs">Pre-Renders Embed when</p>
        <pre>
          {`<PreRenderedAppEmbed preRenderId="pre-render" /> is rendered`}
        </pre>
      </div>
      <div className="card">
        <Link to="/pre-render-on-demand">Pre-Render On Demand Embed</Link>
        <p className="read-the-docs">
          Pre-Renders Embed only when the Embed is rendered at-least once.
        </p>
      </div>
    </>
  );
};

const Layout = () => {
  return (
    <div className="embed-init">
      <nav>
        <Link to="/">Home</Link>
        <Link to="/normal">Normal Embed</Link>
        <Link to="/pre-render">Pre-Render Embed</Link>
        <Link to="/pre-render-on-demand">Pre-Render On Demand Embed</Link>
      </nav>
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <EmbedInit>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/normal" element={<NormalEmbed />} />
            <Route path="/pre-render" element={<PreRenderEmbed />} />
            <Route
              path="/pre-render-on-demand"
              element={<PreRenderEmbedOnDemand />}
            />
          </Route>
        </Routes>
      </EmbedInit>
    </BrowserRouter>
  );
}

export default App;
