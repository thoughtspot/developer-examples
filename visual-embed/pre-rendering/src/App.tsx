import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import {
  NormalEmbed,
  NormalLiveboardEmbed,
  PreRenderEmbed,
  PreRenderEmbedOnDemand,
  PreRenderLiveboardWithLiveboardId,
  PreRenderLiveboardWithoutLiveboardId_1,
  PreRenderLiveboardWithoutLiveboardId_2,
} from "./embeds";
import {
  PreRenderedAppEmbed,
  AuthType,
  AuthStatus,
  useInit,
  PreRenderedLiveboardEmbed,
} from "@thoughtspot/visual-embed-sdk/react";

const routesData = [
  {
    path: "/normal",
    title: "Normal Embed",
    description:
      "Normal Render is the default behavior of the ThoughtSpot SDK. Loads the ThoughtSpot app when the component is rendered.",
    element: <NormalEmbed />,
  },
  {
    path: "/pre-render",
    title: "Pre-Render Embed",
    description:
      "Pre-Renders Embed when `<PreRenderedAppEmbed preRenderId='pre-render' />` is rendered.",
    element: <PreRenderEmbed />,
  },
  {
    path: "/pre-render-on-demand",
    title: "Pre-Render On Demand Embed",
    description:
      "Pre-Renders Embed only when the Embed is rendered at least once.",
    element: <PreRenderEmbedOnDemand />,
  },
  {
    path: "/pre-render-with-liveboard-id",
    title: "Pre-Render Liveboard With Liveboard Id",
    description:
      "Pre-Renders a liveboard Embed when the <PreRenderedLiveboardEmbed liveboardId='<id>' preRenderId='pre-render-with-liveboard-id' /> is rendered.",
    element: <PreRenderLiveboardWithLiveboardId />,
  },
  {
    path: "/pre-render-without-liveboard-id-1",
    title: "Pre-Render Liveboard Without Liveboard Id 1",
    description:
      "Pre-Renders a generic Embed when the <PreRenderedLiveboardEmbed preRenderId='pre-render-without-liveboard-id' /> is rendered. The liveboardId is passed when the Embed is rendered and we navigate to the liveboard. Since this is a generic pre-render we just load the basic assets needed for rendering the app, this might not be as fast as pre-rendering with liveboardId but it is faster than normal rendering.",
    element: <PreRenderLiveboardWithoutLiveboardId_1 />,
  },
  {
    path: "/pre-render-without-liveboard-id-2",
    title: "Pre-Render Liveboard Without Liveboard Id 2",
    description:
      "This is same as above but we can reuse the same pre-render shell here.",
    element: <PreRenderLiveboardWithoutLiveboardId_2 />,
  },
  {
    path: "/normal-liveboard",
    title: "Normal Liveboard",
    description:
      "Normal Render is the default behavior of the ThoughtSpot SDK. Loads the ThoughtSpot app when the component is rendered.",
    element: <NormalLiveboardEmbed />,
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="embed-init">
      <PreRenderedAppEmbed preRenderId="pre-render" />
      <PreRenderedLiveboardEmbed preRenderId="pre-render-without-liveboard-id" />
      <PreRenderedLiveboardEmbed
        liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
        preRenderId="pre-render-with-liveboard-id"
      />
      {children}
    </div>
  );
};

const Home = () => {
  return (
    <>
      <h1>ThoughtSpot Pre-Rendering</h1>
      {routesData.map(({ path, title, description }) => (
        <div className="card" key={path}>
          <Link to={path}>{title}</Link>
          <p className="read-the-docs">{description}</p>
        </div>
      ))}
    </>
  );
};

const Layout = () => {
  return (
    <div className="embed-init">
      <nav>
        <Link to="/">Home</Link>
        {routesData.map(({ path, title }) => (
          <Link key={path} to={path}>
            {title}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <EmbedInit>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            {routesData.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Route>
        </Routes>
      </EmbedInit>
    </BrowserRouter>
  );
};

export default App;
