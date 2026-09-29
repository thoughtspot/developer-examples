import { useEffect, useState } from "react";
import "./App.css";
import tsLogo from "/ts-logo.svg";
import { AuthType, LiveboardEmbed, useInit } from "@thoughtspot/visual-embed-sdk/react";
import { THOUGHTSPOT_HOST } from "./constants";
import { getCachedAuthToken, getThoughtSpotClient } from "./get-auth-token";

interface Liveboard {
  id: string;
  name: string;
}

async function getLiveboards(): Promise<Liveboard[]> {
  const client = getThoughtSpotClient();
  const results = await client.searchMetadata({ metadata: [{ type: "LIVEBOARD" }] });
  return results.map((r) => ({ id: r.metadata_id!, name: r.metadata_name! }));
}

export default function App() {
  const [liveboards, setLiveboards] = useState<Liveboard[] | null>(null);
  const [selectedLiveboard, setSelectedLiveboard] = useState<Liveboard | null>(null);

  useEffect(() => {
    getLiveboards()
      .then(setLiveboards)
      .catch((error) => {
        console.error("Error fetching liveboards:", error);
        setLiveboards([]);
      });
  }, []);

  return (
    <div className="app">
      <header>
        <img src={tsLogo} alt="ThoughtSpot logo" />
        <h1>Reuse Token — REST API SDK + Embed SDK</h1>
        {selectedLiveboard && (
          <button className="back-btn" onClick={() => setSelectedLiveboard(null)}>
            ← Back to list
          </button>
        )}
      </header>

      {!selectedLiveboard && (
        <LiveboardList liveboards={liveboards} onSelect={setSelectedLiveboard} />
      )}
      {selectedLiveboard && <LiveboardView liveboard={selectedLiveboard} />}
    </div>
  );
}

function LiveboardList({
  liveboards,
  onSelect,
}: {
  liveboards: Liveboard[] | null;
  onSelect: (liveboard: Liveboard) => void;
}) {
  if (liveboards === null) {
    return <p className="status">Loading liveboards…</p>;
  }
  if (liveboards.length === 0) {
    return <p className="status">No liveboards found.</p>;
  }
  return (
    <ul className="liveboard-list">
      {liveboards.map((liveboard) => (
        <li key={liveboard.id}>
          <button onClick={() => onSelect(liveboard)}>{liveboard.name}</button>
        </li>
      ))}
    </ul>
  );
}

function LiveboardView({ liveboard }: { liveboard: Liveboard }) {
  useInit({
    thoughtSpotHost: THOUGHTSPOT_HOST,
    authType: AuthType.TrustedAuthTokenCookieless,
    getAuthToken: getCachedAuthToken,
  });

  return (
    <div className="embed-wrapper">
      <LiveboardEmbed
        key={liveboard.id}
        className="ts-embed"
        liveboardId={liveboard.id}
        frameParams={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
