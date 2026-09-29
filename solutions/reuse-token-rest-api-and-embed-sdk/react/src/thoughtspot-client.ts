import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "./constants";
import { getCachedAuthToken } from "./get-auth-token";

// Bearer config takes the same token-fetcher used by the Embed SDK below,
// so the REST API SDK client authenticates with the shared cached token.
let thoughtSpotClient: ThoughtSpotRestApi;
export const getThoughtSpotClient = () => {
  if (!thoughtSpotClient) {
    const bearerConfig = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, getCachedAuthToken);
    thoughtSpotClient = new ThoughtSpotRestApi(bearerConfig);
  }
  return thoughtSpotClient;
};
