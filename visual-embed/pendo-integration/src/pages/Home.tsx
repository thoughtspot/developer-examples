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
       for more details.
       <br/>
       <br/>
       <b>Note:</b> If you are using your own cluster. make sure to update the init block in the App.tsx with the Pendo secret key and the ThoughtSpot Host along with your cluster details.
      </p>
      <ul> 
        <li><a href="/fullapp">FullApp Embed with modularHomeExperience enabled</a></li>
      </ul>
    </div>
  </>
  );
}