import { useEffect } from "react";
import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
                            activeTabId: '<%=activeTabId%>',
                            fullHeight: true   // Enable liveboard embedding in full height
                        });

                        // Call the render function on the liveboardEmbed variable for rendering
                        liveboardEmbed.render();
                    `}
                </SyntaxHighlighter>
                <h3>Demo</h3>
                <div id="ts-embed" />
            </div>
        </>
    )
}

export default LiveboardWithTabs;