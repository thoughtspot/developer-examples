import {BrowserRouter, Route, Routes} from "react-router";
import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import './App.css';
import { SearchEmbedComponent } from "./components/search/SearchEmbed";
import { Home } from "./components/home/Home";

function App() {

  init({
    thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    authType: AuthType.None,
  });

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/search" element={<SearchEmbedComponent />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;