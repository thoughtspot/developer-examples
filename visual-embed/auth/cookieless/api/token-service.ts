import express from "express";
import { createBasicConfig,  ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import cors from "cors";

const app = express();

const PORT = process.env.VITE_SERVER_PORT || 4000;
const THOUGHTSPOT_HOST = process.env.VITE_THOUGHTSPOT_HOST || 'https://training.thoughtspot.cloud';
const username = process.env.VITE_THOUGHTSPOT_USERNAME
const password =  process.env.VITE_THOUGHTSPOT_PASSWORD

if (!username || !password) {
  throw new Error('Username and password are required');
}


let thoughtspotClient: ThoughtSpotRestApi;
const getThoughtClient = () => {
  if (!thoughtspotClient) {
    const basicClientConfig = createBasicConfig(THOUGHTSPOT_HOST);
    thoughtspotClient = new ThoughtSpotRestApi(basicClientConfig);
  }
  return thoughtspotClient;
}

app.use(express.json());
app.use(cors())


app.get('/my-token-endpoint', async (req, res) => {
  try {
    const thoughtspotClient = getThoughtClient();
    const data = await thoughtspotClient.getFullAccessToken({
      username,
      password,
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