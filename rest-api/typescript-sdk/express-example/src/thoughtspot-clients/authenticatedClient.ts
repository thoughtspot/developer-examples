import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import { THOUGHTSPOT_HOST } from "../constants"


/**
 * This will create a new authenticated client using the token
 *
 * We will use this client to make requests to the thoughtspot api
 */
export const getAuthenticatedClient = (token: string) => {
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, async () => token);
  return new ThoughtSpotRestApi(config);
}
