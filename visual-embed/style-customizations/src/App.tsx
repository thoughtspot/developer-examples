import { AuthType, Page } from '@thoughtspot/visual-embed-sdk';
import { init } from '@thoughtspot/visual-embed-sdk';
import { AppEmbed } from '@thoughtspot/visual-embed-sdk/react';
import './App.css'
import { globalCustomizationConfig, appCustomizationConfig } from './customizations';

/*
  Other Authentication type such as AuthType.Basic is for production, 
  for more info: https://developers.thoughtspot.com/docs/embed-auth
  @props:
  - thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  - authType: AuthType.Basic,
  - username: import.meta.env.VITE_THOUGHTSPOT_USERNAME,
  - password: import.meta.env.VITE_THOUGHTSPOT_PASSWORD,
*/

init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,
  authType: AuthType.None,
  customizations: globalCustomizationConfig,
});

function App() {

  return (
    <div className="app">
        <div className='content_wrapper'>
            {/* Overriding the global style globalCustomizationConfig with the appCustomizationConfig from the customizations.ts file */}
            <AppEmbed pageId={Page.Home} showPrimaryNavbar={true} customizations={appCustomizationConfig} className={'embed_content'} />
        </div>
    </div>
  )
}

export default App
