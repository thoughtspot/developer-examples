import { BodylessConversation, init, AuthType } from "@thoughtspot/visual-embed-sdk";
import { Spin } from "antd";
import React from "react";

init({
    thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
    authType: AuthType.None,
});

const conversation = new BodylessConversation({
    worksheetId: import.meta.env.VITE_TS_DATASOURCE_ID,
});

export const SpotterMessage: React.FC<{ query: string}> = ({ query }) => {
    const viz = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        conversation.sendMessage(query)
            .then((response) => {
                console.log(response);
                response.container!.style.width = "100%";
                response.container!.style.height = "100%";
                response.container!.style.zoom = "0.7";
                viz.current?.replaceChildren(response.container!);
            });
    }, []);
    
    return <div style={{ height: "400px", width: "600px"}} ref={viz}>
        <Spin />
    </div>
}

