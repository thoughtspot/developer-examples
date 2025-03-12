import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

function BasicLiveboard() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                frameParams: {
                    width: '100%',
                    height: '100%',
                },
                liveboardId: import.meta.env.VITE_LIVEBOARD_ID,
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Basic Liveboard" />
            <div className="content-container">
                <p>
                    Thoughtspot liveboard can be embedded with basic options:
                </p>
                <div id="ts-embed" style={{height: '600px'}} />
            </div>
        </>
    )
}

export default BasicLiveboard;