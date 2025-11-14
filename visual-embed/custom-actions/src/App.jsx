import { Route, Routes } from "react-router-dom";

import BurgerMenu from "./components/BurgerMenu/BurgerMenu";

import Home from "./Home";
import ShowDetailsExample from "./examples/ShowDetails/ShowDetailsExample";
import ContentLinkingExample from "./examples/ContentLinking/ContentLinkingExample";
import DetailPaneExample from "./examples/DetailPane/DetailPaneExample";
import JSONReturnExample from "./examples/JSONReturn/JSONReturnExample";

import "./css/tse.css";

import { init, AuthType } from "@thoughtspot/visual-embed-sdk";

export default function App() {
  const tsURL = "https://training.thoughtspot.cloud";
  init({
    thoughtSpotHost: tsURL,
    authType: AuthType.Basic,
    username: "code-sandbox",
    password: "3mbed+#3xplz",
    callPrefetch: true,
  });

  return (
    // TODO - move to a separate components.
    <div className="App">
      <header>
        <BurgerMenu />
      </header>
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route path="/show-details" element={<ShowDetailsExample />} />
        <Route path="/content-linking" element={<ContentLinkingExample />} />
        <Route path="/detail-pane" element={<DetailPaneExample />} />
        <Route path="/json-return" element={<JSONReturnExample />} />
      </Routes>
    </div>
  );
}
