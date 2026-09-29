import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "./constants";
import { getCachedAuthToken } from "./get-auth-token";

let thoughtSpotClient: ThoughtSpotRestApi;
export const getThoughtSpotClient = () => {
  if (!thoughtSpotClient) {
    const bearerConfig = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, getCachedAuthToken);
    thoughtSpotClient = new ThoughtSpotRestApi(bearerConfig);
  }
  return thoughtSpotClient;
};
