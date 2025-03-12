import { createConfiguration, ServerConfiguration, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";


export const getAuthToken = async (credentials: any) => {
    const { tsHost, username, password, secretKey } = credentials;
    const config = createConfiguration({
      baseServer: new ServerConfiguration(tsHost, {}),
    });
      
    const tsRestApiClient = new ThoughtSpotRestApi(config);
  try {
    let authParams: any = {
        username,
        validity_time_in_sec: 30000,
    }
    if (password && password.trim() !== "") {
        authParams = {...authParams, password};
    } else {
        authParams = {...authParams, secret_key: secretKey};
    }
    const data = await tsRestApiClient.getFullAccessToken(authParams);
    return data.token;
  } catch (error) {
    alert("Some error occured");
  }
}