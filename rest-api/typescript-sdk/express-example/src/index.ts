import express, { RequestHandler } from 'express';
import { PORT } from './constants';
import { getCurrentUser, getMetadata } from './handlers/thoughtspot-api';
import { getAuthenticatedClient } from './thoughtspot-clients/authenticated-client';
import path from 'path';
const app = express();
app.use(express.json());

// lets create a simple server


/**
 * Lets us create a server that takes the thoughtspot username in header
 * We will use this to authenticate the user and get the thoughtspot client
 */
const addThoughtSpotClient: RequestHandler = async (req, res, next) => {

  if (req.path === "/") {
    next();
    return;
  }
  
  try {
    const username = req.headers['x-my-username'] as string;
    if (!username) {
      throw new Error('Username is required');
    }
    const thoughtSpotClient = getAuthenticatedClient(username);
    (req as any).thoughtSpotClient = thoughtSpotClient;
    next();
  } catch (error: any) {
    console.error(error.message);
    res.status(401).json({ error: 'Unauthorized', message: error.message });
  }
}
// Serve index.html explicitly on "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "index.html"));
});

app.use(addThoughtSpotClient);

// Apis to fetch data from thoughtspot and return to the client
app.get('/endpoint-1', getCurrentUser);
app.get('/endpoint-2', getMetadata);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});