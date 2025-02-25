import { ServerConfiguration, ThoughtSpotRestApi, createConfiguration } from "@thoughtspot/rest-api-sdk";
import { THOUGHTSPOT_HOST } from "../constant";



const createThoughtspotBasicClient = (thoughtSpotHost: string) => {
  const thoughtspotServer = new ServerConfiguration(thoughtSpotHost, {});
  const basicClientConfig = createConfiguration({
    baseServer: thoughtspotServer,
  });

  return new ThoughtSpotRestApi(basicClientConfig);
}
let thoughtspotBasicClient: ThoughtSpotRestApi | null = null;

/**
 * This function is used to get the basic client
 * The client is created only once and is reused
 * The client is used to make the API calls
 * 
 * @returns ThoughtSpotRestApi
 */
export const getThoughtspotBasicClient = () => {
  if (!thoughtspotBasicClient) {
     thoughtspotBasicClient = createThoughtspotBasicClient(THOUGHTSPOT_HOST);
  }
  return (thoughtspotBasicClient as ThoughtSpotRestApi);
}