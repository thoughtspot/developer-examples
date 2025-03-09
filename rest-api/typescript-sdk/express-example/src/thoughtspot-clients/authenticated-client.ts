import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk"
import { SECRET_KEY, THOUGHTSPOT_HOST, THOUGHTSPOT_PASSWORD, THOUGHTSPOT_USERNAME } from "../constants"
import { getCachedAuthToken } from "./get-auth-token";

const defaultCredentials = {
  username: THOUGHTSPOT_USERNAME,
  password: THOUGHTSPOT_PASSWORD,
}

/**
 * This will create a new authenticated client using the token
 *
 * We will use this client to make requests to the thoughtspot api
 */
export const getAuthenticatedClient = ({
  username,
  password,
}: {
  username: string;
  password?: string;
}) => {

  let credentials: { username: string, password?: string, secret_key?: string} = { username, password };
  
  if (!password) {
    credentials = defaultCredentials;
  }
  
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, () => getCachedAuthToken(credentials));
  return new ThoughtSpotRestApi(config);
}
