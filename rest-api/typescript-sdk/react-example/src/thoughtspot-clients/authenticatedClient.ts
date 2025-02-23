import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "../constant";
import { getAuthTokenWithCache } from "../apis/getAuthToken";

/**
 * Creates a ThoughtSpot client that uses token-based authentication.
 * @param thoughtSpotHost The ThoughtSpot host URL
 * @param getAuthToken Function to retrieve the authentication token
 * @returns A ThoughtSpot client instance
 */
const createThoughtSpotAuthenticatedClient = (thoughtSpotHost: string, getAuthToken: () => Promise<string>) => {
  const tokenConfig = createBearerAuthenticationConfig(thoughtSpotHost, getAuthToken)
  return new ThoughtSpotRestApi(tokenConfig);
}

let thoughtspotAuthenticatedClient: ThoughtSpotRestApi | null = null;

/**
 * Initializes the ThoughtSpot client for cookieless authentication.
 * This function creates a new client if it doesn't exist, or returns the existing client.
 * 
 * @param username The username for authentication
 * @param password The password for authentication
 * @returns void
 */
export const initializeThoughtSpotAuthenticatedClient = ({ username, password }: { username: string, password: string }) => {
  thoughtspotAuthenticatedClient = createThoughtSpotAuthenticatedClient(THOUGHTSPOT_HOST, () => getAuthTokenWithCache({ username, password }));
}


/**
 * Provides a ThoughtSpot client that handles token-based authentication.
 * 
 * The client manages tokens automatically:
 * - Each token has a 5-minute lifetime
 * - Tokens are refreshed 1 minute before expiry
 * - Token is cached and reused across requests
 * 
 * @returns A ThoughtSpot client for making API requests
 */
export const getThoughtSpotAuthenticatedClient = () => {
  if (!thoughtspotAuthenticatedClient) {
    console.error("Client not initialized");
    return null;
  }
  return thoughtspotAuthenticatedClient;
}
/**
 * Destroys the ThoughtSpot client for cookieless authentication.
 * This function sets the client to null.
 */
export const destroyThoughtSpotAuthenticatedClient = () => {
  thoughtspotAuthenticatedClient = null;
}