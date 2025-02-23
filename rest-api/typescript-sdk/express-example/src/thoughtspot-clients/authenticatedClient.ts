import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import { THOUGHTSPOT_HOST } from "../constants"

export const getAuthenticatedClient = (token: string) => {
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, async () => token);

  return new ThoughtSpotRestApi(config);
}
