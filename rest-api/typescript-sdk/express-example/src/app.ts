import express, { RequestHandler } from 'express';
import { PORT, SECRET_KEY } from './constants';
import { getThoughtspotBasicClient } from './thoughtspot-clients/basicClient';
import { getAnswerData, getCurrentUser, getLiveboardData, getMetadata, getSearchData } from './handlers/thoughtspot-api';
import { getAuthenticatedClient } from './thoughtspot-clients/authenticatedClient';

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
const addThoughtSpotToken: RequestHandler = async (req, res, next) => {

  try {
    const client = getThoughtspotBasicClient();

    const tokenRes = await client.getFullAccessToken({
      username: (req as any).username,
      secret_key: SECRET_KEY,
    });
    
    const authenticatedClient = getAuthenticatedClient(tokenRes.token);
    (req as any).authenticatedClient = authenticatedClient;

    next();
  } catch (error: any) {
    console.error(error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.use(authenticateUser);
app.use(addThoughtSpotToken);

// Apis to fetch data from thoughtspot and return to the client
app.get('/api/user', getCurrentUser);
app.get('/api/metadata', getMetadata);
app.get('/api/answer/:answerId', getAnswerData);
app.get('/api/liveboard/:liveboardId', getLiveboardData);
app.get('/api/search', getSearchData);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});