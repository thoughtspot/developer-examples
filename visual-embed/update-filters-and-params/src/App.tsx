import tsLogo from "/ts-logo.svg";
import "./App.css";
import {
  AuthType,
  HostEvent,
  RuntimeFilterOp,
  init,
  type EmbedEvent,
} from "@thoughtspot/visual-embed-sdk";
import {
  LiveboardEmbed,
  useEmbedRef,
} from "@thoughtspot/visual-embed-sdk/react";
import { useEffect } from "react";

const THOUGHTSPOT_LIVEBOARD_ID = import.meta.env.VITE_THOUGHTSPOT_LIVEBOARD_ID;

// init() must run BEFORE any embed component mounts. Calling it at module scope
// guarantees that; the useInit hook runs in a parent effect, which fires AFTER
// child effects, so the embed would construct before init — "Please provide a
// valid URL".
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.Basic,
  username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
});

function App() {
  const liveboardRef = useEmbedRef<typeof LiveboardEmbed>();

  // AFTER LOAD — update runtime filters from the host app's own UI.
  // Note: resets the object to its original state (drills are cleared) before applying.
  const handleUpdateRuntimeFilters = async () => {
    try {
      await liveboardRef.current.trigger(HostEvent.UpdateRuntimeFilters, [
        {
          columnName: "state",
          operator: RuntimeFilterOp.EQ,
          values: ["michigan"],
        },
      ]);
      console.log("Runtime filters updated");
    } catch (e) {
      console.info("Failed with error", e);
    }
  };

  // AFTER LOAD — update values of filters that already exist on the Liveboard.
  // Disambiguate duplicate column names with "WORKSHEET_NAME::COLUMN_NAME".
  const handleUpdateExistingFilters = async () => {
    try {
      await liveboardRef.current.trigger(HostEvent.UpdateFilters, {
        filters: [
          { column: "item type", oper: "IN", values: ["shoes", "boots"] },
        ],
      });
      console.log("Existing filters updated");
    } catch (e) {
      console.info("Failed with error", e);
    }
  };

  // AFTER LOAD — update Parameter values (SDK 1.29.0+ / TS 10.1.0.cl+).
  const handleUpdateParameters = async () => {
    try {
      await liveboardRef.current.trigger(HostEvent.UpdateParameters, [
        { name: "Discount", value: 0.25, isVisibleToUser: true },
      ]);
      console.log("Parameters updated");
    } catch (e) {
      console.info("Failed with error", e);
    }
  };

  // READINESS — the standard pattern for triggering ANY host event at load time,
  // on ANY embed type (LiveboardEmbed, SearchEmbed, AppEmbed, SpotterEmbed — the
  // method is on the shared embed base class). Same pattern for UpdateParameters,
  // UpdateRuntimeFilters, or any other host event.
  // Note: the subscribedEvent pattern does NOT require useHostEventsV2. The
  // "<Event> Subscribed" signal fires on its own (SDK 1.48.0+ / TS 26.4.0.cl+).
  useEffect(() => {
    const embed = liveboardRef.current;
    if (!embed) return;
    const subscribed = embed.subscribedEvent(
      HostEvent.UpdateFilters,
    ) as EmbedEvent;
    const onReady = () => {
      console.log("UpdateFilters is ready to trigger");
      embed.trigger(HostEvent.UpdateFilters, {
        filters: [
          { column: "item type", oper: "IN", values: ["shoes", "boots"] },
        ],
      });
    };
    embed.on(subscribed, onReady);
    return () => {
      embed.off(subscribed, onReady);
    };
  }, []);

  return (
    <>
      <div>
        <a href="https://developers.thoughtspot.com" target="_blank">
          <img src={tsLogo} className="logo" alt="ThoughtSpot logo" />
        </a>
        <h2>Updating filters and parameters programmatically</h2>
      </div>
      <div className="container">
        <div className="card">
          <h2>Liveboard Embed</h2>
          <div>
            <button onClick={handleUpdateRuntimeFilters}>
              Update runtime filters
            </button>
            <button onClick={handleUpdateExistingFilters}>
              Update existing filters
            </button>
            <button onClick={handleUpdateParameters}>Update parameters</button>
          </div>
          <LiveboardEmbed
            liveboardId={THOUGHTSPOT_LIVEBOARD_ID}
            ref={liveboardRef}
            // AT INIT — filters/parameters known upfront go in the view config:
            // no events or timing involved. Prefer this whenever possible.
            runtimeFilters={[
              {
                columnName: "state",
                operator: RuntimeFilterOp.EQ,
                values: ["california"],
              },
            ]}
            runtimeParameters={[{ name: "Discount", value: 0.1 }]}
          />
        </div>
      </div>
    </>
  );
}

export default App;
