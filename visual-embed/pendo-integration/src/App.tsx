import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import Home from './pages/Home';
import { init, AuthType } from '@thoughtspot/visual-embed-sdk';
import FullApp from './pages/FullApp';

/* 
 * This is the visitor config for ThoughtSpot's embed instance used with Pendo. 
 * It helps identify the unique visitor in the Pendo dashboard. 
 * For actual use cases, consider constructing the visitorConfig and accountConfig from your host app's user information.
 * Pendo Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
 */
const visitorConfig = {
  id: 'demo-user@hostApp.com',
  name: 'demo-user',
};

/* 
 * This is the account config for ThoughtSpot's embed instance used with Pendo. 
 * It helps identify the unique account in the Pendo dashboard. 
 * For actual use cases, consider constructing the visitorConfig and accountConfig from your host app's user information.
 * Pendo Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
 */
const accountConfig = {
  id: 'demo-hostApp',
  name: 'demo HostApp',
};

/* 
 * Here we are initializing the embed SDK with our config.
 * Description of the config:
 * thoughtSpotHost: The host name of the ThoughtSpot cluster.
 * authType: The authentication type for the embed SDK.
 * customVariablesForThirdPartyTools: Custom variables accessed in your `pendoIntegration.js` file via the global window object (window.tsEmbed).
 *     pendoKey: The Pendo API key for the embed instance.
 *     pendoVisitorConfig: Visitor config used to identify the unique visitor in Pendo. 
 *         Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
 *     pendoAccountConfig: Account config used to identify the unique account in Pendo. 
 *         Reference: https://support.pendo.io/hc/en-us/articles/21326198721563-Choose-IDs-and-metadata
 * 
 * Note: If using your own ThoughtSpot cluster, update the config with your cluster details and your Pendo key.
 * 
 * Refer to the documentation for more details: 
 *     https://developers.thoughtspot.com/docs/Interface_EmbedConfig#_customvariablesforthirdpartytools
 *     https://developers.thoughtspot.com/docs/Function_init#_init
 */
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.None,
  customVariablesForThirdPartyTools: {
    pendoKey: import.meta.env.VITE_PENDO_KEY,
    pendoVisitorConfig: visitorConfig,
    pendoAccountConfig: accountConfig,
  },
});

// Here we are rendering the Home page and the FullApp page.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/fullapp" element={<FullApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
