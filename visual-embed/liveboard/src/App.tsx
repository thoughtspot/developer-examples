
import {BrowserRouter, Route, Routes} from "react-router";
import Home from './pages/Home';
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";

import './App.css';
import BasicLiveboard from "./pages/BasicLiveboard";
import FullHeightLiveboard from "./pages/FullHeightLiveboard";
import EmbedWithReact from "./pages/EmbedWithReact";
import LiveboardWithTabs from "./pages/LiveboardWithTabs";

function App() {
  
  init({
    thoughtSpotHost: import.meta.env.VITE_TS_HOST,
    authType: AuthType.Basic,
    username: import.meta.env.VITE_TS_USERNAME,
    password: import.meta.env.VITE_TS_PASSWORD,
    callPrefetch: true,
  });

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="basic" element={<BasicLiveboard />} />
          <Route path="fullHeight" element={<FullHeightLiveboard />} />
          <Route path="embedWithReact" element={<EmbedWithReact />} />
          <Route path="withTabs" element={<LiveboardWithTabs />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
