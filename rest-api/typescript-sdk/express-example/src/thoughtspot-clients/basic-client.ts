import { ServerConfiguration, ThoughtSpotRestApi, createConfiguration } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "../constants";


let thoughtspotBasicClient: ThoughtSpotRestApi | null = null;

/**
 * This is a basic client that is used to connect to the thoughtspot without authentication
 * The client is created only once and is reused.
 * 
 * @returns ThoughtSpotRestApi
 */
export const getThoughtspotBasicClient = () => {
  if (!thoughtspotBasicClient) {
    const thoughtspotServer = new ServerConfiguration(THOUGHTSPOT_HOST, {});
    const basicClientConfig = createConfiguration({
      baseServer: thoughtspotServer,
    });

    thoughtspotBasicClient = new ThoughtSpotRestApi(basicClientConfig);
  }

  return (thoughtspotBasicClient as ThoughtSpotRestApi);
}

/**
 * This function is used to destroy the basic client
 */
export const destroyThoughtspotBasicClient = () => {
  thoughtspotBasicClient = null;
}

