import Header from "../components/Header";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
            Initialise the SDK as described in <a href="https://developers.thoughtspot.com/docs/getting-started#initSdk" rel="noreferrer" target="_blank">Installation Guide</a><br />
            <b>Note:</b> Please replace the values with your own cluster details
          </p>
          <p>
            Thoughtspot supports embedding a liveboard with multiple options, frequent use cases are covered below:
            <ul>
              <li><a href="/basicEmbed">With basic parameters</a></li>
              <li><a href="/fullHeightEmbed">Full height liveboard</a></li>
              <li><a href="/embedWithTabs">Liveboard with multiple tabs</a></li>
              <li><a href="/embedWithReact">With React components</a></li>
              <li><a href="/embedWithReactWithOptions">Embed with React with options</a></li>
            </ul>
          </p>
        </div>
      </>
    )
  }

  export default Home;