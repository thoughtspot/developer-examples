/* eslint-disable react/no-unescaped-entities */
import { SearchEmbed, EmbedEvent } from "@thoughtspot/visual-embed-sdk";
import { useEffect } from "react";

function syntaxHighlight(json) {
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    // eslint-disable-next-line no-useless-escape
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = "number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "key";
        } else {
          cls = "string";
        }
      } else if (/true|false/.test(match)) {
        cls = "boolean";
      } else if (/null/.test(match)) {
        cls = "null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}

const showJSON = (payload) => {
  // Try to get the data from the object or just show the entire payload.
  if (payload.data?.embedAnswerData) {
    payload = payload.data.embedAnswerData;
  } else if (payload.data) {
    payload = payload.data;
  }

  let json = `${JSON.stringify(payload, null, 2)}`;
  const showDataElement = document.getElementById("modal-data-content");
  showDataElement.innerHTML = syntaxHighlight(json);

  // display the model box.
  const dataElement = document.getElementById("show-data");
  dataElement.style.display = "block";
};

const closeModal = () => {
  const showDataElement = document.getElementById("show-data");
  showDataElement.style.display = "none"; // hide the box.
};

export const JSONReturnExample = () => {
  useEffect(() => {
    const embed = new SearchEmbed("#embed", {
      collapseDataSources: true,
      disabledActions: [],
      disabledActionReason: "Reason for disabling",
      visibleActions: ["show-json"] /* Removes all actions if empty array */,
      //hiddenActions: [],
      dataSources: ["1b1c237d-9de8-4542-bf1f-0c3157ddb8d2"],
      searchOptions: {
        searchTokenString: "[sales] [product type]",
        executeSearch: true
      }
    });

    embed.on(EmbedEvent.CustomAction, (payload) => showJSON(payload)).render();

    document
      .getElementById("close-modal")
      .addEventListener("click", closeModal);
  });

  return (
    <div id="embedded-liveboard">
      <h1 className="page-title">Show JSON Data</h1>
      <div id="show-data" className="modal">
        <div className="modal-content">
          <span id="close-modal" className="close">
            &times;
          </span>
          <pre id="modal-data-content"></pre>
        </div>
      </div>
      <div id="embed"></div>
      <h2 className="description-title">Description</h2>
      <div className="lots-of-text">
        <p>This example shows how to get get data from a custom action and then show a model box with the
          content of the custom action payload.  After the search loads, you can modify the search and then select
          "Show JSON" from the three-dot menu.  A formatted JSON document should be shown.
        </p>
        <p>This example shows how to get get data from a custom action and then show a model box with the
          content of the custom action payload.
        </p>
        <p>Features used:</p>
        <ul>
          <li>Search embed</li>
          <li>Search tokens</li>
          <li>Custom action</li>
          <li>Action filtering</li>
        </ul>
        <p>Source page: JSONReturnExample.jsx</p>
      </div>
    </div>
  );
};

export default JSONReturnExample;
