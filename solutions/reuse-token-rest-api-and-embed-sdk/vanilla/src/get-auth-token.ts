import type { Token } from "@thoughtspot/rest-api-sdk";
import { DEMO_USER_USERNAME } from "./constants";

// Single cache shared by every caller in this app — the REST API SDK client
// (thoughtspot-client.ts) and the cookieless Embed SDK's `getAuthToken`
// (main.ts) both resolve through this function, so they authenticate with
// the exact same bearer token instead of each minting their own.
let cachedTokenResponse: Token | null = null;
let inFlightRequest: Promise<Token> | null = null;

export const getCachedAuthToken = async (): Promise<string> => {
  if (cachedTokenResponse && cachedTokenResponse.expiration_time_in_millis - Date.now() > 30 * 1000) {
    return cachedTokenResponse.token;
  }

  if (!inFlightRequest) {
    inFlightRequest = fetch("/api/thoughtspot-token", {
      headers: { "x-my-username": DEMO_USER_USERNAME },
    })
      .then((response) => response.json())
      .finally(() => {
        inFlightRequest = null;
      });
  }

  const data = await inFlightRequest;
  cachedTokenResponse = data;
  return data.token;
};
