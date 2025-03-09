import { useState } from "react";
import "./App.css";
import { getThoughtSpotClient } from "./thoughtspot-client/thoughtspot-client";

function App() {
  const [data, setData] = useState("Click button to get liveboard lists");

  const handleGetLiveboardLists = async () => {
    setData("Fetching liveboard lists...");
    try {
      const client = getThoughtSpotClient();
      const metadataList = await client.searchMetadata({
        metadata: [{ type: "LIVEBOARD" }],
      });
      const liveboardNames = metadataList.map((metadata) => ({
        name: metadata.metadata_name,
        id: metadata.metadata_id,
      }));
      setData(JSON.stringify(liveboardNames, null, 2));
    } catch (error) {
      console.error("Error fetching liveboard lists:", error);
      setData("Error fetching liveboard lists");
    }
  };
  return (
    <>
      <h2>ThoughtSpot Rest Api Sdk React Example</h2>
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
