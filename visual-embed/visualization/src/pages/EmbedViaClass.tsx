import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed, RuntimeFilterOp } from "@thoughtspot/visual-embed-sdk";

function EmbedViaClass() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        //apply runtime filters
        const runtimeFilters = [
            {
                columnName: "state",
                operator: RuntimeFilterOp.EQ,
                values: ["michigan"],
            },
        ];

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                frameParams: {
                    width: '100%',
                    height: '100%',
                },
                liveboardId: import.meta.env.VITE_LIVEBOARD_ID,
                vizId: import.meta.env.VITE_LIVEBOARD_VIZ_ID,
                runtimeFilters: runtimeFilters
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Embed Via LiveboardClass" />
            <div className="content-container">
                <p>
                Thoughtspot visualization can be embedded with multiple <a href="https://developers.thoughtspot.com/docs/Interface_LiveboardViewConfig" rel="noreferrer" target="_blank">view configs</a> as:
                </p>
                <div id="ts-embed" style={{height: '600px'}} />
            </div>
        </>
    )
}

export default EmbedViaClass;