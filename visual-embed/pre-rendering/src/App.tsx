import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useOutletContext } from "react-router";
import normalReadme from "./examples/normal/README.md?raw";
import normalLiveboardReadme from "./examples/normal-liveboard/README.md?raw";
import preRenderReadme from "./examples/pre-render/README.md?raw";
import preRenderOnDemandReadme from "./examples/pre-render-on-demand/README.md?raw";
import preRenderWithIdReadme from "./examples/pre-render-with-liveboard-id/README.md?raw";
import preRenderWithoutIdReadme from "./examples/pre-render-without-liveboard-id/README.md?raw";
import preRenderFullHeightReadme from "./examples/pre-render-full-height/README.md?raw";
import preRenderFullHeightNoIdReadme from "./examples/pre-render-full-height-no-id/README.md?raw";
import PreRenderHome from "./PreRenderHome";
import NormalEmbed from "./examples/normal";
import PreRenderEmbed from "./examples/pre-render";
import PreRenderEmbedOnDemand from "./examples/pre-render-on-demand";
import PreRenderLiveboardWithLiveboardId from "./examples/pre-render-with-liveboard-id";
import { Liveboard1 as PreRenderWithoutId1, Liveboard2 as PreRenderWithoutId2 } from "./examples/pre-render-without-liveboard-id";
import NormalLiveboardEmbed from "./examples/normal-liveboard";
import PreRenderWithFullHeight from "./examples/pre-render-full-height";
import { Liveboard1 as FullHeightNoId1, Liveboard2 as FullHeightNoId2 } from "./examples/pre-render-full-height-no-id";
import {
  AuthType,
  AuthStatus,
  useInit,
} from "@thoughtspot/visual-embed-sdk/react";

type SubRoute = { path: string; title: string; element: React.ReactElement };
type RouteData = {
  path: string;
  title: string;
  description: string;
  color: string;
  readme: string;
  element?: React.ReactElement;
  children?: SubRoute[];
};

const routesData: RouteData[] = [
  {
    path: "normal",
    title: "Normal Embed",
    description: "Default SDK behavior — reloads ThoughtSpot on every visit.",
    color: "#4A90E2",
    readme: normalReadme,
    element: <NormalEmbed />,
  },
  {
    path: "pre-render",
    title: "Pre-Render Embed",
    description: "Starts loading the liveboard in the background. Navigate to the liveboard for an instant load.",
    color: "#2ECC71",
    readme: preRenderReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render" liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b" /> },
      { path: "liveboard", title: "View Liveboard", element: <PreRenderEmbed /> },
    ],
  },
  {
    path: "pre-render-on-demand",
    title: "Pre-Render On Demand",
    description: "Starts loading on first visit; all subsequent visits use the cached instance.",
    color: "#F39C12",
    readme: preRenderOnDemandReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render-on-demand" liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b" /> },
      { path: "liveboard", title: "View Liveboard", element: <PreRenderEmbedOnDemand /> },
    ],
  },
  {
    path: "pre-render-with-liveboard-id",
    title: "Pre-Render Liveboard (With ID)",
    description: "Pre-renders a specific liveboard by ID for instant load.",
    color: "#9B59B6",
    readme: preRenderWithIdReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render-with-liveboard-id" liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b" /> },
      { path: "liveboard", title: "View Liveboard", element: <PreRenderLiveboardWithLiveboardId /> },
    ],
  },
  {
    path: "pre-render-without-liveboard-id",
    title: "Pre-Render Liveboard (Without ID)",
    description: "Pre-renders a generic shell; reuse it across multiple liveboards.",
    color: "#1ABC9C",
    readme: preRenderWithoutIdReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render-without-liveboard-id" /> },
      { path: "liveboard-1", title: "Liveboard 1", element: <PreRenderWithoutId1 /> },
      { path: "liveboard-2", title: "Liveboard 2", element: <PreRenderWithoutId2 /> },
    ],
  },
  {
    path: "normal-liveboard",
    title: "Normal Liveboard",
    description: "Default LiveboardEmbed behavior — reloads the liveboard on every visit.",
    color: "#E74C3C",
    readme: normalLiveboardReadme,
    element: <NormalLiveboardEmbed />,
  },
  {
    path: "pre-render-full-height",
    title: "Pre-Render + Full Height",
    description: "Pre-renders the liveboard in the background with fullHeight enabled — expands to fit all content.",
    color: "#E67E22",
    readme: preRenderFullHeightReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render-full-height" liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b" /> },
      { path: "liveboard", title: "View Liveboard", element: <PreRenderWithFullHeight /> },
    ],
  },
  {
    path: "pre-render-full-height-no-id",
    title: "Pre-Render Full Height (No ID)",
    description: "Pre-renders a generic shell with fullHeight — reuse across multiple liveboards without re-initialising.",
    color: "#8E44AD",
    readme: preRenderFullHeightNoIdReadme,
    children: [
      { path: "home", title: "Home", element: <PreRenderHome preRenderId="pre-render-full-height-no-id" /> },
      { path: "liveboard-1", title: "Liveboard 1", element: <FullHeightNoId1 /> },
      { path: "liveboard-2", title: "Liveboard 2", element: <FullHeightNoId2 /> },
    ],
  },
];

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

  if (loading) return <div className="loading">Connecting to ThoughtSpot...</div>;

  return <>{children}</>;
};

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="home">
      <h1>ThoughtSpot Pre-Rendering</h1>
      <p className="subtitle">Explore different embedding strategies and their performance trade-offs.</p>
      <div className="examples-grid">
        {routesData.map(({ path, title, description, color, readme }) => (
          <div
            key={path}
            className="example-card"
            style={{ "--accent": color } as React.CSSProperties}
            onClick={() => navigate(`/${path}`)}
          >
            <h3>{title}</h3>
            <p>{description}</p>
            <details className="readme-details" onClick={e => e.stopPropagation()}>
              <summary>How it's implemented</summary>
              <pre className="readme-content">{readme}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExampleLayout = ({ route }: { route: RouteData }) => (
  <div className="example-layout" style={{ "--accent": route.color } as React.CSSProperties}>
    <div className="sub-nav">
      <Link to="/" className="back-link">← Home</Link>
      <span className="divider" />
      <span className="example-title">{route.title}</span>
      {route.children?.map((child) => (
        <Link key={child.path} to={child.path} className="sub-link">{child.title}</Link>
      ))}
    </div>
    <Outlet />
  </div>
);

export type LoaderContext = { showLoader: boolean };

const LoaderLayout = ({ route }: { route: RouteData }) => {
  const [showLoader, setShowLoader] = useState(false);
  return (
    <div className="example-layout" style={{ "--accent": route.color } as React.CSSProperties}>
      <div className="sub-nav">
        <Link to="/" className="back-link">← Home</Link>
        <span className="divider" />
        <span className="example-title">{route.title}</span>
        {route.children?.map((child) => (
          <Link key={child.path} to={child.path} className="sub-link">{child.title}</Link>
        ))}
        <label className="nav-toggle">
          <input type="checkbox" checked={showLoader} onChange={e => setShowLoader(e.target.checked)} />
          Custom loader
        </label>
      </div>
      <Outlet context={{ showLoader } satisfies LoaderContext} />
    </div>
  );
};

const Layout = () => (
  <div className="app-layout">
    <nav className="top-nav">
      <Link to="/" className="nav-home">ThoughtSpot Pre-Rendering</Link>
      {routesData.map(({ path, title, color }) => (
        <Link key={path} to={`/${path}`} className="nav-link" style={{ "--accent": color } as React.CSSProperties}>
          {title}
        </Link>
      ))}
    </nav>
    <Outlet />
  </div>
);

const App = () => (
  <BrowserRouter>
    <EmbedInit>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          {routesData.map((route) => {
            if (route.children) {
              const loaderRoutes = new Set(["pre-render-full-height-no-id", "pre-render-without-liveboard-id"]);
            const Layout = loaderRoutes.has(route.path) ? LoaderLayout : ExampleLayout;
              return (
                <Route key={route.path} path={route.path} element={<Layout route={route} />}>
                  <Route index element={<Navigate to="home" replace />} />
                  {route.children.map((child) => (
                    <Route key={child.path} path={child.path} element={child.element} />
                  ))}
                </Route>
              );
            }
            return <Route key={route.path} path={route.path} element={route.element} />;
          })}
        </Route>
      </Routes>
    </EmbedInit>
  </BrowserRouter>
);

export default App;
