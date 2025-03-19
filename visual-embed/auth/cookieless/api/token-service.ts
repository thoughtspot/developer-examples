import express from "express";
import { createBasicConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"

const app = express();

const PORT = process.env.VITE_SERVER_PORT || 4000;
const THOUGHTSPOT_HOST = process.env.VITE_THOUGHTSPOT_HOST || 'https://training.thoughtspot.cloud';
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD;
const SECRET_KEY = process.env.VITE_THOUGHTSPOT_SECRET_KEY;


let thoughtspotClient: ThoughtSpotRestApi;
const getThoughtSpotClient = () => {
  if (!thoughtspotClient) {
    const basicClientConfig = createBasicConfig(THOUGHTSPOT_HOST);
    thoughtspotClient = new ThoughtSpotRestApi(basicClientConfig);
  }
  return thoughtspotClient;
}

app.use(express.json());

app.get('/my-token-endpoint', async (req, res) => {
  try {
    const username = req.headers['x-my-username'] as string;

    const credentials = SECRET_KEY ?
      // In production use cases use Secret key
      { secret_key: SECRET_KEY } :
      { password: DEMO_USER_PASSWORD }

    const thoughtspotClient = getThoughtSpotClient();
    const data = await thoughtspotClient.getFullAccessToken({
      username,
      ...credentials
    });

    res.status(200).json({ token: data.token });
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
  console.log("Server listening on", `https://localhost:${PORT}`);
});