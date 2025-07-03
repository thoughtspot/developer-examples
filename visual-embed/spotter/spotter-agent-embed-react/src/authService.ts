import { AuthType } from '@thoughtspot/visual-embed-sdk';
import {
  createConfiguration,
  ServerConfiguration,
  ThoughtSpotRestApi,
} from '@thoughtspot/rest-api-sdk';

const isProduction = true;

// Define interfaces for better type safety
interface OnlineConfigType {
  thoughtSpotHost: string;
  username: string;
  tokenServer: string;
  authType: AuthType;
  worksheetId: string;
}

interface LocalConfigType {
  thoughtSpotHost: string;
  username: string;
  secretKey: string;
  authType: AuthType;
  worksheetId: string;
}

// Configuration for online deployment (public values)
// In Vite, use VITE_ prefix and import.meta.env
const ONLINE_CONFIG: OnlineConfigType = {
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST || '',
  username: import.meta.env.VITE_USERNAME || '',
  tokenServer: import.meta.env.VITE_TOKEN_SERVER || '',
  authType: AuthType.TrustedAuthTokenCookieless,
  worksheetId: import.meta.env.VITE_WORKSHEET_ID || '',
};

// Configuration for local development (private values)
const LOCAL_CONFIG: LocalConfigType = {
  thoughtSpotHost: import.meta.env.VITE_LOCAL_THOUGHTSPOT_HOST || '',
  username: import.meta.env.VITE_LOCAL_USERNAME || '',
  secretKey: import.meta.env.VITE_LOCAL_SECRET_KEY || '',
  authType: AuthType.TrustedAuthTokenCookieless,
  worksheetId: import.meta.env.VITE_LOCAL_WORKSHEET_ID || '',
};

export const CONFIG = isProduction ? ONLINE_CONFIG : LOCAL_CONFIG;
const TOKEN_ENDPOINT = isProduction ? `${(CONFIG as OnlineConfigType).tokenServer}/api/gettoken/${CONFIG.username}` : '';

export const getAuthToken = async (): Promise<string> => {
  if (isProduction) {
    const response = await fetch(TOKEN_ENDPOINT);
    return response.text();
  } else {
    const localConfig = CONFIG as LocalConfigType;
    const config = createConfiguration({
      baseServer: new ServerConfiguration(localConfig.thoughtSpotHost, {}),
    });
    const tsRestApiClient = new ThoughtSpotRestApi(config);
    
    const data = await tsRestApiClient.getFullAccessToken({
      username: localConfig.username,
      secret_key: localConfig.secretKey,
      validity_time_in_sec: 30000,
    });
    return data.token;
  }
}; 