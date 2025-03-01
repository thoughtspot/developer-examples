import Header from "../components/Header";
import SyntaxHighlighter from 'react-syntax-highlighter';

function Home() {

    return (
      <>
        <Header title="Example Liveboard Embedding" />
        <div className="content-container">
          <p>
            This sandbox contains examples for how to <a href="https://developers.thoughtspot.com/docs/embed-liveboard" rel="noreferrer" target="_blank">Embed a Liveboard</a> in your application.
          </p>
          <h2>Getting Started</h2>
          <p>Install the latest <a href="https://www.npmjs.com/package/@thoughtspot/visual-embed-sdk" rel="noreferrer" target="_blank">Visual Embed SDK</a> from npm registry</p>
          <p>
            Initialise the SDK as described:
            <SyntaxHighlighter>
              {`
                init({
                  thoughtSpotHost: '<%=tshost%>',
                  authType: AuthType.Basic,
                  username: '<%=tsusername%>',
                  password: '<%=tspassword%>',
                });
              `}
            </SyntaxHighlighter>
            <b>Note:</b> Please replace the values with your own cluster details
          </p>
        </div>
      </>
    )
  }

  export default Home;