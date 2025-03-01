import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

function FullHeightLiveboard() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                frameParams: {
                    width: '100%',
                    height: '100%',
                },
                liveboardId: '9bd202f5-d431-44bf-9a07-b4f7be372125',
                fullHeight: true
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Full Height Liveboard" />
            <div id="ts-embed" style={{height: '600px'}} />
        </>
    )
}

export default FullHeightLiveboard;