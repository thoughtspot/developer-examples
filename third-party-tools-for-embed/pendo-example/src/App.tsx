import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from './pages/Home'
import { init, AuthType } from '@thoughtspot/visual-embed-sdk'
import FullApp from './pages/FullApp';

/* 
* here we are initialising the embed sdk with our config.
* Description of the config:
* thoughtSpotHost: This is the host name of the thoughtspot cluster.
* authType: This is the authentication type for the embed sdk.
* customVariablesForThirdPartyTools: This is the custom variables object which your pendoIntegration.js file is using through the window object {window.tsEmbed}.
*     pendoKey: Pass your pendo key here to be used to initialise pendo in the embed instance.
*     hostName: This is the host name of the thoughtspot cluster, its value is the same as thoughtspotHost.
* Note: If using your own thoughtspot cluster. Update the config with your cluster details and your pendo Key.
* Refer the documentation for more details: 
*     https://developers.thoughtspot.com/docs/Interface_EmbedConfig#_customvariablesforthirdpartytools
*     https://developers.thoughtspot.com/docs/Function_init#_init
*/
init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.None,
  customVariablesForThirdPartyTools: {
    pendoKey: import.meta.env.VITE_PENDO_KEY,
    hostName: import.meta.env.VITE_THOUGHTSPOT_HOST,
  },
})

// here we are rendering the home page and the fullApp page.
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/fullapp" element={<FullApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
