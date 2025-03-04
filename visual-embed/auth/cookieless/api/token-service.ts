import express from "express";
import { createConfiguration, ServerConfiguration, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import cors from "cors";

const app = express();

const PORT = process.env.SERVER_PORT || 4000;
const THOUGHTSPOT_HOST = process.env.VITE_THOUGHTSPOT_HOST;
const SECRET_KEY = process.env.SECRET_KEY;

if (!THOUGHTSPOT_HOST || !SECRET_KEY) {
  console.error("THOUGHTSPOT_HOST and SECRET_KEY environment variables must be set.");
  process.exit(1);
}

let thoughtspotClient: ThoughtSpotRestApi;
const getThoughtClient = () => {

  if (!thoughtspotClient) {
    const thoughtspotServer = new ServerConfiguration(THOUGHTSPOT_HOST, {});
    const basicClientConfig = createConfiguration({
      baseServer: thoughtspotServer,
    });

    thoughtspotClient = new ThoughtSpotRestApi(basicClientConfig);
  }
  return thoughtspotClient;

}

app.use(express.json());
app.use(cors())

app.get('/api/token', async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const username = url.searchParams.get("username");

    if (!username) {
      res.status(400).json({ error: "Username is required." });
      return;
    }


    const thoughtspotClient = getThoughtClient();
    const data = await thoughtspotClient.getFullAccessToken({
      username,
      secret_key: SECRET_KEY,
    });

    res.status(200).json({ token: data.token });
  }
  catch (e) { 
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.options('/api/token', function (req, res) {
  console.log("here first")
  res.json({ message: "Hello, world!" }).status(200);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on", `https://localhost:${PORT}`);
});