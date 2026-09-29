import { init, AuthType, LiveboardEmbed } from "@thoughtspot/visual-embed-sdk";
import { THOUGHTSPOT_HOST } from "./constants";
import { getCachedAuthToken, getThoughtSpotClient } from "./get-auth-token";

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

async function getLiveboards(): Promise<Liveboard[]> {
  const client = getThoughtSpotClient();
  const results = await client.searchMetadata({ metadata: [{ type: "LIVEBOARD" }] });
  return results.map((r) => ({ id: r.metadata_id!, name: r.metadata_name! }));
}

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

function renderLiveboardList(liveboards: Liveboard[]) {
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
}

backBtn.addEventListener("click", showList);

getLiveboards()
  .then(renderLiveboardList)
  .catch((error) => {
    console.error("Error fetching liveboards:", error);
    statusEl.textContent = "Error fetching liveboards.";
  });
