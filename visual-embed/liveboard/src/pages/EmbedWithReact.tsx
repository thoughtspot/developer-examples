import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

function EmbedWithReact() {

    return (
        <>
            <Header title="Embed with React" />
            <div className="content-container">
                <p>
                    Thoughtspot liveboard can be embedded with react component as:
                </p>
                <LiveboardEmbed liveboardId={import.meta.env.VITE_LIVEBOARD_ID} fullHeight />
            </div>
        </>
    )
}

export default EmbedWithReact;