import Header from "../components/Header";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

function EmbedViaReact() {

    return (
        <>
            <Header title="Embed with React" />
            <div className="content-container">
                <p>
                    Thoughtspot visualization can be embedded with react component as:
                </p>
                <SyntaxHighlighter language="javascript" style={a11yDark}>
                    {`
                        import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
                        ...
                        render () {
                            return (
                                <LiveboardEmbed liveboardId="<%=liveboardId%>" vizId="<%=vizId%>" />
                            );
                        }
                    `}
                </SyntaxHighlighter>
                <h3>Demo</h3>
                <LiveboardEmbed frameParams={{height: 400}} liveboardId={import.meta.env.VITE_LIVEBOARD_ID} vizId={import.meta.env.VITE_LIVEBOARD_VIZ_ID} />
            </div>
        </>
    )
}

export default EmbedViaReact;