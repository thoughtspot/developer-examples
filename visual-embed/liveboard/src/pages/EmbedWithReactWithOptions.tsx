import { useEffect } from "react";
import Header from "../components/Header";
import { EmbedEvent, HostEvent, LiveboardEmbed, RuntimeFilterOp, useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";

function EmbedWithReactWithOptions() {

    const ref = useEmbedRef<typeof LiveboardEmbed>();
    //apply runtime filters

    const runtimeFilters = [
        {
            columnName: "state",
            operator: RuntimeFilterOp.EQ,
            values: ["michigan"],
        },
    ];

    const onLoad = () => {
        console.log(EmbedEvent.Load, {});
    };

    // Standard pattern for triggering a host event at load time: listen for the
    // "<Event> Subscribed" ready signal via subscribedEvent() — it fires the moment
    // the embedded app has registered its handler, so the trigger cannot be dropped.
    // Note: this does NOT require useHostEventsV2 (Subscribed event: SDK 1.48.0+ / ThoughtSpot 26.4.0.cl+).
    useEffect(() => {
        const embed = ref.current;
        if (!embed) return;
        const subscribed = embed.subscribedEvent(HostEvent.SetVisibleVizs) as EmbedEvent;
        const onReady = () => {
            embed.trigger(HostEvent.SetVisibleVizs, [
                "3f84d633-e325-44b2-be25-c6650e5a49cf",
                "28b73b4a-1341-4535-ab71-f76b6fe7bf92",
            ]);
        };
        embed.on(subscribed, onReady);
        return () => {
            embed.off(subscribed, onReady);
        };
    }, []);

    return (
        <>
            <Header title="React Embed with Options" />
            <div className="content-container">
                <p>
                    Thoughtspot liveboard can be embedded with react component as:
                </p>
                <LiveboardEmbed
                    ref={ref}
                    liveboardId={import.meta.env.VITE_LIVEBOARD_ID}
                    runtimeFilters={runtimeFilters}
                    onLoad={onLoad}
                    fullHeight={true} />
            </div>
        </>
    )
}

export default EmbedWithReactWithOptions;
