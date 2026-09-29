import { ThoughtSpotRestApi, createBearerAuthenticationConfig, type Token } from "@thoughtspot/rest-api-sdk";
import { DEMO_USER_USERNAME, THOUGHTSPOT_HOST } from "./constants";

let cachedTokenResponse: Token | null = null;
let inFlightRequest: Promise<Token> | null = null;

export const getCachedAuthToken = async (): Promise<string> => {
  // Reuse the cached token while it still has 30s left on its lifetime.
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

let thoughtSpotClient: ThoughtSpotRestApi;
export const getThoughtSpotClient = () => {
  if (!thoughtSpotClient) {
    const bearerConfig = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, getCachedAuthToken);
    thoughtSpotClient = new ThoughtSpotRestApi(bearerConfig);
  }
  return thoughtSpotClient;
};
