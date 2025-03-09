import { useState } from "react";
import "./App.css";
import { getThoughtSpotClient } from "./thoughtspot-client/thoughtspot-client";

function App() {
  const [data, setData] = useState("Click button to get liveboard lists");

  const handleGetLiveboardLists = async () => {
    setData("Fetching liveboard lists...");
    const client = getThoughtSpotClient();
    const metadataList = await client.searchMetadata({
      metadata: [{ type: "LIVEBOARD" }],
    });
    setData(JSON.stringify(metadataList));
  };
  return (
    <>
      <h1>ThoughtSpot Rest Api Sdk React Example</h1>
      <div className="card">
        <button onClick={handleGetLiveboardLists}>Get liveboard lists</button>         
        <p>
          <code>{data}</code>
        </p>
      </div>
    </>
  );
}

export default App;
