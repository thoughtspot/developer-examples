import { init, AuthType, LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import { THOUGHTSPOT_HOST } from "./constants";
import { getCachedAuthToken } from "./get-auth-token";
import { getThoughtSpotClient } from "./thoughtspot-client";

interface Liveboard {
  id: string;
  name: string;
}

const statusEl = document.getElementById("status")!;
const listEl = document.getElementById("liveboardList")!;
const embedWrapperEl = document.getElementById("embed-wrapper")!;
const backBtn = document.getElementById("backBtn")!;

init({
  thoughtSpotHost: THOUGHTSPOT_HOST,
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: getCachedAuthToken,
});

function showList() {
  embedWrapperEl.hidden = true;
  embedWrapperEl.innerHTML = "";
  listEl.hidden = false;
  backBtn.hidden = true;
}

function showLiveboard(liveboard: Liveboard) {
  listEl.hidden = true;
  backBtn.hidden = false;
  embedWrapperEl.hidden = false;
  embedWrapperEl.innerHTML = "";

  const liveboardEmbed = new LiveboardEmbed(embedWrapperEl, {
    liveboardId: liveboard.id,
    frameParams: { width: "100%", height: "100%" },
  });
  liveboardEmbed.render();
}

backBtn.addEventListener("click", showList);

const client = getThoughtSpotClient();
client
  .searchMetadata({ metadata: [{ type: "LIVEBOARD" }] })
  .then((results) => {
    const liveboards: Liveboard[] = results.map((r) => ({
      id: r.metadata_id!,
      name: r.metadata_name!,
    }));

    if (liveboards.length === 0) {
      statusEl.textContent = "No liveboards found.";
      return;
    }

    statusEl.hidden = true;
    listEl.hidden = false;
    liveboards.forEach((liveboard) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.textContent = liveboard.name;
      button.addEventListener("click", () => showLiveboard(liveboard));
      li.appendChild(button);
      listEl.appendChild(li);
    });
  })
  .catch((error) => {
    console.error("Error fetching liveboards:", error);
    statusEl.textContent = "Error fetching liveboards.";
  });
