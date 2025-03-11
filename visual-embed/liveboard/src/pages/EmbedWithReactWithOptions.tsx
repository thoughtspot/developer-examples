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
    
    //Register an event handler to trigger the SetVisibleVizs event when the Liveboard is rendered
    const onLiveboardRendered = () => {
        ref.current.trigger(HostEvent.SetVisibleVizs, [
            "3f84d633-e325-44b2-be25-c6650e5a49cf",
            "28b73b4a-1341-4535-ab71-f76b6fe7bf92",
        ]);
      };

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
                    onLiveboardRendered={onLiveboardRendered}
                    fullHeight={true} />
            </div>
        </>
    )
}

export default EmbedWithReactWithOptions;