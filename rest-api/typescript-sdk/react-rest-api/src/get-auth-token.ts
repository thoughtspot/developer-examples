import { Token } from "@thoughtspot/rest-api-sdk";

// fetch auth token from token server
let cachedTokenResponse: Token | null = null;

const TOKEN_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL || "";
export const getCachedAuthToken = async () => {
  // if token has 30s remaining, return cached token
  if (cachedTokenResponse && cachedTokenResponse.expiration_time_in_millis - Date.now() > 30 * 1000) {
    return cachedTokenResponse.token;
  }
  // fetch new token

  const username = import.meta.env.VITE_DEMO_USER_USERNAME;

  const response = await fetch(`${TOKEN_SERVER_URL}/my-token-endpoint`, {
    headers: {
      "x-my-username": username,
    },
  });
  const data = await response.json();
  cachedTokenResponse = data;
  return data.token;
}