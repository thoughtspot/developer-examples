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

    const onLiveboardRendered = () => {
        ref.current.trigger(HostEvent.Delete, {
            vizId: import.meta.env.VITE_LIVEBOARD_VIZ_ID
        });
      };

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
                    onLiveboardRendered={onLiveboardRendered}
                    onLoad={onLoad} />
            </div>
        </>
    )
}

export default EmbedViaReact;