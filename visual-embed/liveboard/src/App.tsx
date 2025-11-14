
import {BrowserRouter, Route, Routes} from "react-router";
import Home from './pages/Home';
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";

import './App.css';
import BasicLiveboard from "./pages/BasicLiveboard";
import FullHeightLiveboard from "./pages/FullHeightLiveboard";
import EmbedWithReact from "./pages/EmbedWithReact";
import LiveboardWithTabs from "./pages/LiveboardWithTabs";
import EmbedWithReactWithOptions from "./pages/EmbedWithReactWithOptions";

init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_TS_USERNAME,
  password: import.meta.env.VITE_TS_PASSWORD,
  callPrefetch: true,
});

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="basicEmbed" element={<BasicLiveboard />} />
          <Route path="fullHeightEmbed" element={<FullHeightLiveboard />} />
          <Route path="embedWithReact" element={<EmbedWithReact />} />
          <Route path="embedWithTabs" element={<LiveboardWithTabs />} />
          <Route path="embedWithReactWithOptions" element={<EmbedWithReactWithOptions />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
