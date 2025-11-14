import { EmbedEvent, LiveboardEmbed, RuntimeFilterOp } from "@thoughtspot/visual-embed-sdk";
import { LiveboardContextActionData } from "../../apis/dataclasses.js";
import { useEffect } from "react";

import './ShowDetails.css';

export const ShowDetailsExample = () => {

  const showPayload = (payload) => {
    const liveboardContextData = LiveboardContextActionData.createFromJSON(payload);

    // Only gets the first column value.
    const filter = liveboardContextData.data[liveboardContextData.columnNames[0]];
    // Now show the details with the filter applied in a popup.
    const embed = new LiveboardEmbed("#embed-popup", {
      frameParams: {},
      disabledActions: [],
      disabledActionReason: "Reason for disabling",
      hiddenActions: [],
      liveboardId: "e40c0727-01e6-49db-bb2f-5aa19661477b",
      vizId: "96db6db8-662a-45b5-bc70-00341d75846b",
      runtimeFilters: [{
        columnName: 'state',
        operator: RuntimeFilterOp.EQ,
        values: [filter]
     }],
   });
   embed.render();

   // display the model box.
   const dataElement = document.getElementById('show-data');
   dataElement.style.display = 'block';
  }

  const closeModal = () => {
    const showDataElement = document.getElementById('show-data')
    showDataElement.style.display = 'none';  // hide the box.
  }

  const actionID = 'show-details';

  useEffect(() => {
    const embed = new LiveboardEmbed("#embed", {
      liveboardId: "e40c0727-01e6-49db-bb2f-5aa19661477b",
      vizId: "8d2e93ad-cae8-4c8e-a364-e7966a69a41e",
      visibleActions: [actionID]
    });

    embed
    .on(EmbedEvent.CustomAction, payload => {
      console.log('custom action: ', payload);
      if (payload.id === actionID || payload.data.id === actionID) {
        console.log('showing details for', payload);
        showPayload(payload)
      }
    })
    .render();

    document.getElementById('close-modal').addEventListener('click', closeModal);
  });


  return (
    <div id="embedded-liveboard">
      <h1 className="page-title">Show Data Details</h1>
      <div id="show-data" className="modal">
        <div className="modal-content">
          <span id="close-modal" className="close">&times;</span>
          <div id="embed-popup"></div>
        </div>
      </div>

      <div id="embed"></div>
      <div>
        <h2 className="description-title">Description</h2>
        <div className="lots-of-text">
        <p>This example show how you can use liveboard embedding for getting details in a modal chart.  Once the
          map has loaded, you can right click on a state and get details about that state.  Note that the pop-up is
          completely interactive as with the initial liveboard visualization.
        </p>
        <p>Features used:</p>
        <ul>
          <li>Liveboard visualization embed</li>
          <li>Context custom action</li>
        </ul>
        <p>Source page: ShowDetailsExample.jsx</p>
        </div>
      </div>
    </div>
  );
};

export default ShowDetailsExample;
