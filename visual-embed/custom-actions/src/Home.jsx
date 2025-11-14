/* eslint-disable react/no-unescaped-entities */

import "./css/tse.css";

export default function Home() {
  return (
    <div className="Home">
      <h1 className="page-title">Example Custom Actions</h1>
      <div className="lots-of-text">
        <p>
          This sandbox contains multiple examples of using &nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://developers.thoughtspot.com/docs/?pageid=customize-actions"
          >ThoughtSpot Custom Actions
          </a>
          . A custom action is a type of extension that can be added to
          ThoughtSpot searches, answers and liveboards to give users additional
          capabilities. For example, an inventory manager might search ThoughtSpot
          for items that are low in stock and push a reorder directly from
          ThoughtSpot to their inventory system.
        </p>
        <p>
          The examples here all use the callback approach for custom actions. This
          means that the action triggers an event in the parent application. The
          embedding application will get the data from the current search results or data point
          in the search results and then perform some action. What that action might be is
          up to you as the developer.
        </p>
        <p>
          You can navigate to the examples by selecting the "burger" menu in the upper
          left corner.  For each example there is a description, how to use the example, and the key features used.
          It also lists the name of the source file if you want to see the code behind the example.
        </p>
      </div>
      <img src="/ts.png" alt="ThoughtSpot logo" className="center" />
    </div>
  );
}
