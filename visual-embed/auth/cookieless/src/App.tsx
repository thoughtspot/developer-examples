import { useEffect, useState } from "react";
import tsLogo from "/ts-logo.svg";
import "./App.css";
import {
  AppEmbed,
  init,
  AuthType,
  useInit,
  AuthStatus,
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

const THOUGHTSPOT_HOST = import.meta.env.VITE_THOUGHTSPOT_HOST || 'https://training.thoughtspot.cloud';

const FullAppEmbed = () => { 
  const authEE = useInit({
    authType: AuthType.TrustedAuthTokenCookieless,
    getAuthToken: getThoughtspotToken,
    thoughtSpotHost: THOUGHTSPOT_HOST,
  });

  useEffect(() => {
    if (authEE.current) {
      authEE.current.on(AuthStatus.SDK_SUCCESS, () => {
        console.log('Init successful')
      })
    }
  }, []);

  return (
    <div>
      <span className="header">
        {tsLogo ? <img src={tsLogo} alt="ThoughtSpot Logo" /> : null}
        <span>Cookie-less App Embed</span>
      </span>
      <AppEmbed />
    </div>
  );
};

export default App;
