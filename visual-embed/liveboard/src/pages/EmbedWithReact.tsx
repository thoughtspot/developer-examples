import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";

function EmbedWithReact() {

    return (
        <>
            <Header title="Embed with React" />
            <LiveboardEmbed liveboardId="9bd202f5-d431-44bf-9a07-b4f7be372125" fullHeight />
        </>
    )
}

export default EmbedWithReact;