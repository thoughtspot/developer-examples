import Header from "../components/Header";
export default function Home() {
  return (
    <>
    <Header title="Pendo Integration" />
    <div className="content-container">

      <h2>Getting Started</h2>
      <p>
       To enable Pendo integration, please contact ThoughtSpot support. Refer the 
       <a href="https://developers.thoughtspot.com/docs/external-tool-script-integration" rel="noreferrer" target="_blank"> documentation </a>
       for more details. javaScript for pendo integration is available in the <a href="https://github.com/thoughtspot/third-party-tools-for-embed/tree/main/pendo-example/pendoIntegration" rel="noreferrer" target="_blank">pendoIntegration</a> repository. Once enabled, you can use the following code to embed fullApp with Pendo initialised.
       <br/>
       <br/>
       <b>Note:</b> Make sure to update the init block in the App.tsx with the Pendo secret key and the ThoughtSpot Host along with your cluster details.
      </p>
      <ul> 
        <li><a href="/fullapp">FullApp Embed with Pendo enabled</a></li>
      </ul>
    </div>
  </>
  );
}