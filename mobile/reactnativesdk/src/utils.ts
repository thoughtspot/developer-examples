import { createConfiguration, ServerConfiguration, ThoughtSpotRestApi } from '@thoughtspot/rest-api-sdk';

export const getTokenFromSDK = async (tokenConfig: any) => {
    const config = createConfiguration({
        baseServer: new ServerConfiguration(tokenConfig.tsHost, {}),
      });

    const tsRestApiClient = new ThoughtSpotRestApi(config);
    const tokenRequestData:any = {
        username: tokenConfig.username,

        validity_time_in_sec: 30000,
    }
    if(tokenConfig.password !== '') {
        tokenRequestData.password = tokenConfig.password;
    } else {
        tokenRequestData.secret_key = tokenConfig.secretKey;
    }
      try {
        const data = await tsRestApiClient.getFullAccessToken(tokenRequestData);
        return data.token;
      } catch (error: any) {
        console.error(error);
        return '';
      }
};

export const customStyleVars = {
    "--ts-var-root-background": "#fef4dd",
    "--ts-var-root-color": "#4a4a4a",
    "--ts-var-viz-title-color": "#8e6b23",
    "--ts-var-viz-title-font-family": "'Georgia', 'Times New Roman', serif",
    "--ts-var-viz-title-text-transform": "capitalize",
    "--ts-var-viz-description-color": "#6b705c",
    "--ts-var-viz-description-font-family": "'Verdana', 'Helvetica', sans-serif",
    "--ts-var-viz-description-text-transform": "none",
    "--ts-var-viz-border-radius": "6px",
    "--ts-var-viz-box-shadow": "0 3px 6px rgba(0, 0, 0, 0.15)",
    "--ts-var-viz-background": "#fffbf0",
    "--ts-var-viz-legend-hover-background": "#ffe4b5",
}