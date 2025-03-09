import express, { RequestHandler } from 'express';
import { PORT } from './constants';
import { getCurrentUser, getMetadata } from './handlers/thoughtspot-api';
import { getAuthenticatedClient } from './thoughtspot-clients/authenticated-client';
import path from 'path';
const app = express();
app.use(express.json());

// lets create a simple server

/**
 * Simple authentication middleware that extracts username from Authorization header.
 * 
 * NOTE: This is a basic implementation for demo purposes only.
 * It simply uses the username as the auth token in format: "Bearer <username>"
 * For production, use proper authentication methods like JWT or OAuth.
 */
const authenticateUser: RequestHandler = async (req, res, next) => {

  if (req.path === "/") {
    next();
    return;
  }

  const authToken = req.headers['authorization'];
  if (!authToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const username = authToken.split(' ')[1];
  if (!username) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as any).username = username;

  next();
};

/**
 * Now since we have the username from the authenticateUser middleware, we can add the thoughtspot's client to the request
 * and use it in the thoughtspot-api handlers
 * 
 * We will use the getAuthenticatedClient function to get the authenticated client
 * and add it to the request
 */
const addThoughtSpotClient: RequestHandler = async (req, res, next) => {

  if (req.path === "/") {
    next();
    return;
  }

  try {
    const thoughtSpotClient = getAuthenticatedClient({ username: (req as any).username });
    (req as any).thoughtSpotClient = thoughtSpotClient;
    next();
  } catch (error: any) {
    console.error(error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
// Serve index.html explicitly on "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(import.meta.dirname, "index.html"));
});

app.use(authenticateUser);
app.use(addThoughtSpotClient);

// Apis to fetch data from thoughtspot and return to the client
app.get('/api/user', getCurrentUser);
app.get('/api/metadata', getMetadata);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});