import { AuthType, init } from "@thoughtspot/visual-embed-sdk";
import './App.css';
import { SearchEmbedComponent } from "./components/search/SearchEmbed";


init({
    thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    authType: AuthType.None,
});

function App() {

  return (
    <>
      <SearchEmbedComponent />
    </>
  )
}

export default App;
