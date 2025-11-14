import { Token } from "@thoughtspot/rest-api-sdk";
import { DEMO_USER_PASSWORD, SECRET_KEY } from "../constants";
import { getThoughtspotBasicClient } from "./basic-client";

// caching the user token
const tokenCache: Record<string, Token> = {}

/**
 * Get the cached auth token, here we cache the token based on the username
 */
export const getCachedAuthToken = async (username: string) => {
  const cacheResponse = tokenCache[username];
  // if cached token token has 30s remaining, return cached token
  if (
    cacheResponse && 
    cacheResponse.expiration_time_in_millis - Date.now() > 30 * 1000
  ) {
    return cacheResponse.token;
  }

  // fetch new token
  const client = getThoughtspotBasicClient();

  const credentials = SECRET_KEY
    ? { secret_key: SECRET_KEY }
    // for demo lets use the demo password if secret key is not provided
    : { password: DEMO_USER_PASSWORD };

  const tokenResponse = await client.getFullAccessToken({
    username,
    ...credentials,
  });

  tokenCache[username] = tokenResponse

  return tokenResponse.token;
}