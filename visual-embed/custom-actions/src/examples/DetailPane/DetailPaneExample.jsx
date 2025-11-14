/* eslint-disable react/no-unescaped-entities */
import {EmbedEvent, SearchEmbed} from "@thoughtspot/visual-embed-sdk";
import {useEffect} from "react";
import {ContextActionData, SearchData, tabularDataToHTML} from "../../apis/dataclasses";
import {getSearchData} from "../../apis/rest-api";

import './DetailPane.css';

export const DetailPaneExample = () => {

  const showDetails = (payload) => {
    const actionData = ContextActionData.createFromJSON(payload);

    // This takes advantage of the fact that we know the saved answer.  In a real scenario, we might want to introspect
    // the data to figure out the columns.  For now, we just want to get the Product Type.
    const productType = actionData.data["Product Type"][0];

    const tsURL = "https://training.thoughtspot.cloud"
    const wsGUID = "1b1c237d-9de8-4542-bf1f-0c3157ddb8d2";
    const detailSearch = "[Region] [Store] [Sales] [Product] [Product Type] = '" + productType + "'";
    getSearchData(tsURL, wsGUID, detailSearch)
      .then(searchResults => {
        console.log(searchResults);
        const searchData = SearchData.createFromJSON(searchResults);

        const embedElement = document.getElementById("embed");
        embedElement.style.height = "60vh";

        const detailsElement = document.getElementById("detail-pane");
        detailsElement.innerHTML = tabularDataToHTML(searchData);
        detailsElement.style.display = "block";
      })
      .catch(error => {
        console.error(error);
      });

    document.getElementById('detail-pane').style.display = 'block';
  }

  useEffect(() => {
    const embed = new SearchEmbed("#embed", {
      visibleActions: ['show-details'], /* Removes all actions if empty array */
      answerId: "34825e54-d303-4a2e-8c70-4745a442a2bc",
    });
    embed
      .on(EmbedEvent.CustomAction, payload => {
        console.log(payload);
        if (payload.data.id === 'show-details') {
          showDetails(payload);
        }
      })
      .render();
  });

  return (
    <div id="embedded-liveboard">
      <h1 className="page-title">Show Detail Pane</h1>
      <div id="embed"></div>
      <div id="detail-pane"></div>
      <h2 className="description-title">Description</h2>
      <div className="lots-of-text">
        <p>This example shows how to get more information about a data point from a search. This differs from
          drill down in that the fields can be pre-defined. After the answer loads, you can right click on a data point
          and select "Show Details". You should see a new pane with the details of the search show up.
        </p>
        <p>Features used:</p>
        <ul>
          <li>Saved answer embed</li>
          <li>Context custom action</li>
          <li>Search Data API</li>
          <li>rest-api.js</li>
          <li>dataclasses.js</li>
        </ul>
        <p>Source page: DetailPaneExample.jsx</p>
      </div>
    </div>
  );
};

export default DetailPaneExample;
