// This function is used to get the auth token for the ThoughtSpot API
// We will use the basic client to get the token since it doesn't require 
// any authentication before getting the token

import { GetFullAccessTokenRequest } from "@thoughtspot/rest-api-sdk";
import { getThoughtspotBasicClient } from "../thoughtspot-clients/basicClient";

export const getAuthToken = async (inputs: GetFullAccessTokenRequest) => {
  const client = getThoughtspotBasicClient();
  const tokenResponse = await client.getFullAccessToken(inputs);

  return tokenResponse.token;
}

/**
 * Gets an authentication token with caching functionality.
 * The token is valid for 5 minutes and will be refreshed automatically 
 * when less than 1 minute of validity remains.
 * @returns Promise<string> The authentication token
 */

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const getAuthTokenWithCache = async ({ username, password }: { username: string, password: string }): Promise<string> => {
  const TOKEN_REFRESH_TIME_MS = 60 * 1000;
  const TOKEN_VALIDITY_MS = 5 * TOKEN_REFRESH_TIME_MS;

  // Check if token needs refresh (more than 1 minute remaining)
  if (cachedToken && tokenExpiryTime && (Date.now() - tokenExpiryTime) > TOKEN_REFRESH_TIME_MS) {
    return cachedToken;
  }

  const token = await getAuthToken({
    username,
    password,
    validity_time_in_sec: TOKEN_VALIDITY_MS / 1000,
  });
  cachedToken = token;
  tokenExpiryTime = Date.now();
  return token;
}