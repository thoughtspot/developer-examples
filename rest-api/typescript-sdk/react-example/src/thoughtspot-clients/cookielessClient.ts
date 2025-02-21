import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "../constant";
import { getAuthTokenWithCache } from "../apis/getAuthToken";

/**
 * Creates a ThoughtSpot client that uses token-based authentication.
 * @param thoughtSpotHost The ThoughtSpot host URL
 * @param getAuthToken Function to retrieve the authentication token
 * @returns A ThoughtSpot client instance
 */
const createThoughtSpotTokenClient = (thoughtSpotHost: string, getAuthToken: () => Promise<string>) => {
  const tokenConfig = createBearerAuthenticationConfig(thoughtSpotHost, getAuthToken)
  return new ThoughtSpotRestApi(tokenConfig);
}

let thoughtspotTokenClient: ThoughtSpotRestApi | null = null;

/**
 * Initializes the ThoughtSpot client for cookieless authentication.
 * This function creates a new client if it doesn't exist, or returns the existing client.
 * 
 * @returns A ThoughtSpot client for cookieless authentication
 */
export const initializeThoughtSpotCookielessClient = ({ username, password }: { username: string, password: string }) => {
  thoughtspotTokenClient = createThoughtSpotTokenClient(THOUGHTSPOT_HOST, () => getAuthTokenWithCache({ username, password }));
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
export const getThoughtSpotCookielessClient = () => {
  if (!thoughtspotTokenClient) {
    console.error("Client not initialized");
    return null;
  }
  return thoughtspotTokenClient;
}
/**
 * Destroys the ThoughtSpot client for cookieless authentication.
 * This function sets the client to null.
 */
export const destroyThoughtSpotCookielessClient = () => {
  thoughtspotTokenClient = null;
}