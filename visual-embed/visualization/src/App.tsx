import {BrowserRouter, Route, Routes} from "react-router";
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";

import './App.css';
import Home from "./pages/Home";

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
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App