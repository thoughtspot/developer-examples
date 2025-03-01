import { ServerConfiguration, ThoughtSpotRestApi, createConfiguration } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "../constants";



const createThoughtspotBasicClient = (thoughtSpotHost: string) => {
  const thoughtspotServer = new ServerConfiguration(thoughtSpotHost, {});
  const basicClientConfig = createConfiguration({
    baseServer: thoughtspotServer,
  });

  return new ThoughtSpotRestApi(basicClientConfig);
}
let thoughtspotBasicClient: ThoughtSpotRestApi | null = null;

/**
 * This function is used to get the basic client which is connected to the thoughtspot server
 * The client is created only once and is reused.
 * 
 * @returns ThoughtSpotRestApi
 */
export const getThoughtspotBasicClient = () => {
  if (!thoughtspotBasicClient) {
     thoughtspotBasicClient = createThoughtspotBasicClient(THOUGHTSPOT_HOST);
  }

  return (thoughtspotBasicClient as ThoughtSpotRestApi);
}

/**
 * This function is used to destroy the basic client
 */
export const destroyThoughtspotBasicClient = () => {
  thoughtspotBasicClient = null;
}

