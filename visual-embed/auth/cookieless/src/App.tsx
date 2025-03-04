import { useEffect, useState } from "react";
import tsLogo from "/ts-logo.svg";
import "./App.css";
import { AppEmbed, init, AuthType, AuthStatus } from "@thoughtspot/visual-embed-sdk/react";
import { getThoughtspotToken } from "./services/token";

function App() {
  const [username, setUsername] = useState("");

  const [nameForEmbed, setNameForEmbed] = useState("");

  return (
    <div className="container">
      <div className="leftPanel">
        <span>Enter username</span>
        <input
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <button onClick={() => setNameForEmbed(username)} className="action">
          <div>
            <img src={tsLogo} />
            <span>Show embed</span>
          </div>
        </button>
      </div>
      <div className="rightPanel">
        <span>Embed for {nameForEmbed}</span>
        <FullAppEmbed username={nameForEmbed} />
      </div>
    </div>
  );
}

const FullAppEmbed = ({ username }: { username: string }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!username) {
      setIsInitialized(false);
      return;
    }
    const ee = init({
      authType: AuthType.TrustedAuthTokenCookieless,
      getAuthToken: () => getThoughtspotToken({ username }),
      thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    });
    ee.on(AuthStatus.FAILURE, (e) => {
      console.log("Auth failed", e);
    })
    setIsInitialized(true);
  }, [username]);

  return (
    <div>
      {isInitialized ? <AppEmbed /> : null}
    </div>
  );
};

export default App;
