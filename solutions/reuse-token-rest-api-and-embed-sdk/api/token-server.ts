import express from "express";
import {
  createBasicConfig,
  ThoughtSpotRestApi,
} from "@thoughtspot/rest-api-sdk";

const app = express();

const PORT = process.env.VITE_SERVER_PORT || 4000;
const THOUGHTSPOT_HOST = (
  process.env.VITE_THOUGHTSPOT_HOST || "https://training.thoughtspot.cloud"
).replace(/\/+$/, "");
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD;
const SECRET_KEY = process.env.VITE_THOUGHTSPOT_SECRET_KEY;

let thoughtspotClient: ThoughtSpotRestApi;
const getThoughtSpotClient = () => {
  if (!thoughtspotClient) {
    const basicClientConfig = createBasicConfig(THOUGHTSPOT_HOST);
    thoughtspotClient = new ThoughtSpotRestApi(basicClientConfig);
  }
  return thoughtspotClient;
};

app.use(express.json());

// Issues the one token that both the REST API SDK client and the cookieless
// Embed SDK auth use — see src/get-auth-token.ts for how it's cached and reused.
app.get("/api/thoughtspot-token", async (req, res) => {
  try {
    const username = req.headers["x-my-username"] as string;

    const credentials = SECRET_KEY
      ? // In production use cases use a Secret key
        { secret_key: SECRET_KEY }
      : { password: DEMO_USER_PASSWORD };

    const client = getThoughtSpotClient();
    const data = await client.getFullAccessToken({
      username,
      ...credentials,
    });

    res
      .status(200)
      .json({
        token: data.token,
        expiration_time_in_millis: data.expiration_time_in_millis,
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.listen(PORT, () => {
  console.log("Token server listening on", `http://localhost:${PORT}`);
});
