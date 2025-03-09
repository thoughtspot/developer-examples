import express from "express";
import { createConfiguration, ServerConfiguration, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import cors from "cors";

const app = express();

const PORT = process.env.VITE_SERVER_PORT || 4000;
const THOUGHTSPOT_HOST = process.env.VITE_THOUGHTSPOT_HOST || 'https://training.thoughtspot.cloud';
const username = process.env.VITE_THOUGHTSPOT_USERNAME
const password = process.env.VITE_THOUGHTSPOT_PASSWORD

// Returns a basic client to connect to thoughtspot server which doesn't require any authentication
let thoughtspotClient: ThoughtSpotRestApi;
const getThoughtSpotClient = () => {
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



if (!username || !password) {
  throw new Error('Username and password are required');
}

app.get('/api/token', async (req, res) => {
  try {
    const thoughtspotClient = getThoughtSpotClient();
    const data = await thoughtspotClient.getFullAccessToken({
      username,
      password,
      // we will use this token thats valid for 2 minutes
      validity_time_in_sec: 60 * 2
    });

    res.status(200).json(data);
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.all('/', function (req, res) {
  res.json({ message: "Hello, world!" });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on", `http://localhost:${PORT}`);
});
