import {BrowserRouter, Route, Routes} from "react-router";
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";

import './App.css';
import Home from "./pages/Home";
import EmbedViaClass from "./pages/EmbedViaClass";
import EmbedViaReact from "./pages/EmbedViaReact";

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
          <Route path="/embedViaClass" element={<EmbedViaClass />} />
          <Route path="/embedViaReact" element={<EmbedViaReact />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App