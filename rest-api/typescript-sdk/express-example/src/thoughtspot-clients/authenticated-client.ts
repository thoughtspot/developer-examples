import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import { THOUGHTSPOT_HOST } from "../constants"
import { getCachedAuthToken } from "./get-auth-token";

/**
 * This will create a new authenticated client using the token
 *
 * We will use this client to make requests to the thoughtspot api
 */
export const getAuthenticatedClient = (username: string) => {
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, () => getCachedAuthToken(username));
  return new ThoughtSpotRestApi(config);
}
