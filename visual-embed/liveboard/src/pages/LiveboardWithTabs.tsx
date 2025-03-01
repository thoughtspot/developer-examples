import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

function LiveboardWithTabs() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                liveboardId: '194eb0a3-c8be-40b4-8150-2901d13a6c8c',
                activeTabId: '49abe8db-44fa-47f4-a2db-47461904ceb0',
                fullHeight: true
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Liveboard With Tabs" />
            <div id="ts-embed" />
        </>
    )
}

export default LiveboardWithTabs;