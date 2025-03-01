import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
                    Thoughtspot liveboard can be embedded with basic options as:
                </p>
                <SyntaxHighlighter language="javascript" style={a11yDark}>
                    {`
                        import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";

                        const embedEle = document.getElementById('ts-embed');

                        /* Initialise the liveboard instance with target dom element and liveboardId */
                        const liveboardEmbed = new LiveboardEmbed(embedEle, {
                            frameParams: {
                                width: '100%',
                                height: '100%',
                            },
                            liveboardId: '<%=liveboardId%>',
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

export default BasicLiveboard;