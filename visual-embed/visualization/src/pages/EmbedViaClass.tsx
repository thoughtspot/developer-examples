import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

function EmbedViaClass() {

    useEffect(() => {
        const embedEle = document.getElementById('ts-embed');

        if(embedEle) {
            const liveboardEmbed = new LiveboardEmbed(embedEle, {
                frameParams: {
                    width: '100%',
                    height: '100%',
                },
                liveboardId: import.meta.env.VITE_LIVEBOARD_ID,
                vizId: import.meta.env.VITE_LIVEBOARD_VIZ_ID
            });
            liveboardEmbed.render();
        }
    }, []);

    return (
        <>
            <Header title="Embed Via LiveboardClass" />
            <div className="content-container">
                <p>
                    Thoughtspot visualization can be embedded with basic options as:
                </p>
                <SyntaxHighlighter language="javascript" style={a11yDark}>
                    {`
                        import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
                           
                        const embedEle = document.getElementById('ts-embed');
                          
                        /* Initialise the liveboard instance with target dom element, liveboardId and vizId */
                        const liveboardEmbed = new LiveboardEmbed(embedEle, {
                            frameParams: {
                                width: '100%',
                                height: '100%',
                            },
                            liveboardId: '<%=liveboardId%>',
                            vizId: '<%=vizId%>'
                        });
                          
                        // Call the render function on the liveboardEmbed variable for rendering
                        liveboardEmbed.render();
                    `}
                </SyntaxHighlighter>
                <h3>Demo</h3>
                <div id="ts-embed" style={{height: '600px'}} />
            </div>
        </>
    )
}

export default EmbedViaClass;