import { useEffect, useState } from "react";
import tsLogo from "/ts-logo.svg";
import "./App.css";
import {
  AppEmbed,
  init,
  AuthType,
} from "@thoughtspot/visual-embed-sdk/react";
import { getThoughtspotToken } from "./services/token";

function App() {
  return (
    <div className="container">
      <div className="rightPanel">
        <FullAppEmbed />
      </div>
    </div>
  );
}

const FullAppEmbed = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    init({
      authType: AuthType.TrustedAuthTokenCookieless,
      getAuthToken: getThoughtspotToken,
      thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    });
    setIsInitialized(true);
  }, []);

  return (
    <div>
      <span className="header">
        {tsLogo ? <img src={tsLogo} alt="ThoughtSpot Logo" /> : null}
        <span>Cookie-less App Embed</span>
      </span>
      {isInitialized ? <AppEmbed /> : null}
    </div>
  );
};

export default App;
