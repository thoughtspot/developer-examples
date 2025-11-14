import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

function LiveboardWithTabs() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                liveboardId: import.meta.env.VITE_LIVEBOARD_ID,
                activeTabId: import.meta.env.VITE_LIVEBOARD_ACTIVE_TAB_ID,
                fullHeight: true
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Liveboard With Tabs" />
            <div className="content-container">
                <p>
                    Thoughtspot liveboard with active tab can be added as:
                </p>
                <div id="ts-embed" />
            </div>
        </>
    )
}

export default LiveboardWithTabs;