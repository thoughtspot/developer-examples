/* eslint-disable react/no-unescaped-entities */
import {useEffect} from "react";

import {EmbedEvent, HostEvent, LiveboardEmbed, RuntimeFilterOp} from "@thoughtspot/visual-embed-sdk";
import {LiveboardContextActionData} from "../../apis/dataclasses";

let columnNameToFilter = ''; // Global value for the column name that will be used to filter
let filterValues = [''];  // Global array of filterValues, used in the runtimeFilters when the Liveboard is rendered. Starts blank so no filter is applied

let embed;

const actionID = 'filter-content';

const embedLiveboard = () => {
  embed = new LiveboardEmbed("#embed", {
    liveboardId: "b504e160-3025-4508-a76a-1beb1f4b5eed",
    visibleActions: [actionID],
    /*
    runtimeFilters: [{
      columnName: columnNameToFilter,
      operator: RuntimeFilterOp.EQ,
      values: filterValues
    }],
     */
  });

  embed
    .on(EmbedEvent.CustomAction, (payload) => {
      // The id is defined when creating the Custom Action in ThoughtSpot. Checking id attribute allows correct routing of multiple Custom Actions
      if (payload.id === actionID || payload.data.id === actionID) {
        filterData(payload);
      }
    })
    .render();
}

const filterData = (payload) => {
  const actionData = LiveboardContextActionData.createFromJSON(payload);
  columnNameToFilter = actionData.columnNames[0];
  filterValues = [];
  filterValues.push(actionData.data[columnNameToFilter][0]);
  console.log('filtering on ' + filterValues);

  embed.trigger(HostEvent.UpdateRuntimeFilters, [{
    columnName: columnNameToFilter,
    operator: RuntimeFilterOp.EQ,
    values: filterValues,
  }]);
}

export const ContentLinkingExample = () => {
  useEffect(() => {
    embedLiveboard();
  });

  return (
    <div id="embedded-liveboard">
      <h1 className="page-title">Content Linking</h1>
      <div id="embed"></div>
      <h2 className="description-title">Description</h2>
      <div className="lots-of-text">
        <p>This example shows how you can use runtime filters to create cross linking between objects. After the
          liveboard has loaded, you can right click on a value in the donut (pie) chart and select "Filter Content".
          The liveboard will update with the values filtered.
        </p>
        <p>Features used:</p>
        <ul>
          <li>Liveboard embed</li>
          <li>Context custom action</li>
          <li>Host events</li>
          <li>Runtime filters</li>
          <li>dataclasses.js</li>
        </ul>
        <p>Source page: ContentLinkingExample.jsx</p>
      </div>
    </div>
  );
};

export default ContentLinkingExample;
