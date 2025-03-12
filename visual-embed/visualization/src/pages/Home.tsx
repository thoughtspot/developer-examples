

import Header from '../components/Header';

function Home() {

    return (
      <>
        <Header title="Example Liveboard Embedding" />
        <div className="content-container">
          <p>
            This sandbox contains examples for how to <a href="https://developers.thoughtspot.com/docs/embed-a-viz" rel="noreferrer" target="_blank">Embed a Visualization</a> in your application.
          </p>
          <h2>Getting Started</h2>
          <p>Install the latest <a href="https://www.npmjs.com/package/@thoughtspot/visual-embed-sdk" rel="noreferrer" target="_blank">Visual Embed SDK</a> from npm registry</p>
          <p>
            Initialise the SDK as described in <a href="https://developers.thoughtspot.com/docs/getting-started#initSdk" rel="noreferrer" target="_blank">Installation Guide</a><br />
            <b>Note:</b> Please replace the values with your own cluster details
          </p>
          <p>
            Thoughtspot supports embedding a visualization via LiveboardEmbed package. Visualization can be embedded by using two approaches:
              <ul>
                <li><a href="/embedViaClass">Using LiveboardEmbed Class</a></li>
                <li><a href="/embedViaReact">Using LiveboardEmbed React Component</a></li>
              </ul>
          </p>
        </div>
      </>
    )
  }

  export default Home;