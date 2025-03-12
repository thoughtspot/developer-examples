import { AuthType, Page } from '@thoughtspot/visual-embed-sdk';
import { init } from '@thoughtspot/visual-embed-sdk';
import { AppEmbed } from '@thoughtspot/visual-embed-sdk/react';
import './App.css'; 
import { globalCustomizationConfig, appCustomizationConfig } from './customizations'; 

/*
  Authentication and ThoughtSpot host configuration:
  - The `AuthType.None` is used here for an public embed.
  - For production, `AuthType.Basic` or other authentication types should be used.
  - For more details on authentication, refer to: https://developers.thoughtspot.com/docs/embed-auth

  Props expected for this configuration:
  - thoughtSpotHost: The ThoughtSpot host URL
  - authType: The authentication method (set to `AuthType.None` for public access)
  - username: ThoughtSpot username
  - password: ThoughtSpot password
*/

init({
  thoughtSpotHost: import.meta.env.VITE_THOUGHTSPOT_HOST,  
  authType: AuthType.None,
  customizations: globalCustomizationConfig, // Global customization for the embed's look and feel
});

function App() {
  return (
    <div className="app"> 
        <div className="content_wrapper"> 
            {/* 
              AppEmbed renders the ThoughtSpot embedded page with custom styles.
              - customizations: Overrides global styles with specific app-level customizations.
            */}
            <AppEmbed 
              pageId={Page.Home} 
              showPrimaryNavbar={true}
              customizations={appCustomizationConfig} 
              className={'embed_content'} 
            />
        </div>
    </div>
  );
}

export default App; 

