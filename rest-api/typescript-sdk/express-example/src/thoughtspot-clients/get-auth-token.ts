import { getThoughtspotBasicClient } from "./basic-client";

const TOKEN_VALIDITY_TIME = 60 * 2;

const tokenCache = {}

/**
 * Get the cached auth token, here we cache the token based on the username
 */
export const getCachedAuthToken = async (credentials) => {
  if (!credentials.username || !credentials.password) {
    throw new Error("Username and password are required");
  }

  const { cachedToken, tokenLastFetched } = tokenCache[credentials.username] || {};
  // if token token has 30s remaining, return cached token
  if (cachedToken && (Date.now() - tokenLastFetched < (TOKEN_VALIDITY_TIME - 30))) {
    return cachedToken;
  }

  // fetch new token
  const client = getThoughtspotBasicClient();
  const response = await client.getFullAccessToken({
    username: credentials.username,
    password: credentials.password,
    // Instead of password, you can use secret_key to authenticate
    // secret_key: "secret_key"
  });

  tokenCache[credentials.username] = {
    cachedToken: response.token,
    tokenLastFetched: Date.now(),
  }

  return response.token;
}