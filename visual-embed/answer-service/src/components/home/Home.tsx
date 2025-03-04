import "./Home.css";

export const Home = () => {
  return (
    <>
      <h1 className="page-title">Answer Service Examples</h1>
      <div className="container">
        <p>
          This sandbox contains examples of using &nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://developers.thoughtspot.com/docs/?pageid=customize-actions"
          >
            ThoughtSpot Answer Service
          </a>
          . This service could be used to run graphql queries to fetch
          information or perform certain actions.
        </p>
        <h2>Getting Started</h2>
        <p>
          Install the latest{" "}
          <a
            href="https://www.npmjs.com/package/@thoughtspot/visual-embed-sdk"
            rel="noreferrer"
            target="_blank"
          >
            Visual Embed SDK
          </a>{" "}
          from npm registry
        </p>
        <p>
            Replace thoughtSpotHost, dataSourceId, liveboardId in .env file with your ThoughtSpot host, datasource id and liveboard id.
        </p>
        <p>
            Try out AnswerService examples in SearchEmbed here - 
            <ul>
                <li><a href="/search">AnswerService examples in search embed</a></li>
            </ul>
        </p>
        <p>
            These examples include -
            <ul>
                <li><a href="https://developers.thoughtspot.com/docs/Class_AnswerService#_getsourcedetail" rel="noreferrer" target="_blank">Get Source Details</a></li>
                <li><a href="https://developers.thoughtspot.com/docs/Class_AnswerService#_fetchdata" rel="noreferrer" target="_blank">Fetch Data</a></li>
                <li><a href="https://developers.thoughtspot.com/docs/Class_AnswerService#_gettml" rel="noreferrer" target="_blank">Get TML</a></li>
            </ul>
        </p>
      </div>
    </>
  );
};
