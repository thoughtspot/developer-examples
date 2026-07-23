import { useEffect } from "react";
import Header from "../components/Header";
import { EmbedEvent, HostEvent, LiveboardEmbed, RuntimeFilterOp, useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";

function EmbedViaReact() {

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
        const subscribed = embed.subscribedEvent(HostEvent.Delete) as EmbedEvent;
        const onReady = () => {
            embed.trigger(HostEvent.Delete, {
                vizId: import.meta.env.VITE_LIVEBOARD_VIZ_ID
            });
        };
        embed.on(subscribed, onReady);
        return () => {
            embed.off(subscribed, onReady);
        };
    }, []);

    return (
        <>
            <Header title="Embed with React" />
            <div className="content-container">
                <p>
                    Thoughtspot visualization can be embedded with react component with multiple <a href="https://developers.thoughtspot.com/docs/Interface_LiveboardViewConfig" rel="noreferrer" target="_blank">view configs</a> as:
                </p>
                <LiveboardEmbed
                    ref={ref}
                    frameParams={{height: 400}}
                    runtimeFilters={runtimeFilters}
                    liveboardId={import.meta.env.VITE_LIVEBOARD_ID}
                    vizId={import.meta.env.VITE_LIVEBOARD_VIZ_ID}
                    onLoad={onLoad} />
            </div>
        </>
    )
}

export default EmbedViaReact;
