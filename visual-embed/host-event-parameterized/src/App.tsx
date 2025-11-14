import tsLogo from "/ts-logo.svg";
import "./App.css";
import { AuthStatus, AuthType, HostEvent } from "@thoughtspot/visual-embed-sdk";
import {
  LiveboardEmbed,
  SearchEmbed,
  useEmbedRef,
  useInit,
} from "@thoughtspot/visual-embed-sdk/react";
import { useEffect } from "react";

const THOUGHTSPOT_LIVEBOARD_ID = import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID;
const THOUGHTSPOT_VIZ_ID = import.meta.env.VITE_THOUGHTSPOT_VIZ_ID;

function App() {
  const authEERef = useInit({
    thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    authType: AuthType.Basic,
    username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
    password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
  });

  useEffect(() => {
    if (authEERef.current)
      authEERef.current.on(AuthStatus.SDK_SUCCESS, () => {
        console.log("SDK initialized successfully");
      });
  }, []);

  const liveboardRef = useEmbedRef<typeof LiveboardEmbed>();
  const searchRef = useEmbedRef<typeof SearchEmbed>();

  const handlePinForPinboard = async () => {
    try {
      const res = await liveboardRef.current.trigger(HostEvent.Pin, {
        newVizName: "Test Vziz",
        vizId: THOUGHTSPOT_VIZ_ID,
        liveboardId: THOUGHTSPOT_LIVEBOARD_ID,
      });
      console.log("Viz pinned to", res.liveboardId);
      console.log("New viz id", res.liveboardId);
    } catch (e) {
      console.info("Failed with error", e);
    }
  };

  const handlePinForSearch = async () => {
    try {
      const res = await searchRef.current.trigger(HostEvent.Pin, {
        newVizName: "Test Vziz",
        liveboardId: THOUGHTSPOT_LIVEBOARD_ID,
      });
      console.log("Viz pinned to", res.liveboardId);
      console.log("New viz id", res.liveboardId);
    } catch (e) {
      console.info("Failed wit error", e);
    }
  };

  const handleSaveFoSearch = async () => {
    try {
      const res = await searchRef.current.trigger(HostEvent.SaveAnswer, {
        name: "New name",
        description: "Some description",
      });
      console.log("New answer id ", res.answerId);
    } catch (e) {
      console.info("Failed with error", e);
    }
  };

  return (
    <>
      <div>
        <a href="https://developers.thoughtspot.com" target="_blank">
          <img src={tsLogo} className="logo" alt="ThoughtSpot logo" />
        </a>
        <h2>Using Parameterized host events</h2>
      </div>
      <div className="container">
        <div className="card">
          <h2>Liveboard Embed</h2>
          <div>
            <button onClick={handlePinForPinboard}> Pin params</button>
          </div>
          <LiveboardEmbed
            liveboardId="e40c0727-01e6-49db-bb2f-5aa19661477b"
            ref={liveboardRef}
          />
        </div>
        <div className="card">
          <h2>Search Embed</h2>
          <div>
            <button onClick={handlePinForSearch}>Pin params</button>
            <button onClick={handleSaveFoSearch}>Save with params</button>
          </div>
          <SearchEmbed ref={searchRef} />
        </div>
      </div>
    </>
  );
}

export default App;
