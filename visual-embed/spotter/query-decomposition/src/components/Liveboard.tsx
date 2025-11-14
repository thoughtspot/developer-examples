import React,{ useEffect } from 'react';
import { init, LiveboardEmbed, AuthType } from '@thoughtspot/visual-embed-sdk/react';
import './Liveboard.css';

interface LiveboardProps {
  liveboardId: string;
  height?: string;
  width?: string;
}

const THOUGHTSPOT_HOST: string = import.meta.env.VITE_THOUGHTSPOT_HOST || "";
const USERNAME = import.meta.env.VITE_USERNAME || "";
const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || "";
const TOKEN_ENDPOINT = `${TOKEN_SERVER}/api/gettoken/${USERNAME}`;
const BEARER_TOKEN = import.meta.env.VITE_TS_BEARER_TOKEN || "";

init({
    thoughtSpotHost: THOUGHTSPOT_HOST,
    authType: AuthType.TrustedAuthTokenCookieless,
    getAuthToken: async () => {
      if (BEARER_TOKEN) {
        return BEARER_TOKEN;
      }
      const response = await fetch(TOKEN_ENDPOINT);
      return response.text();
    },
});

const Liveboard: React.FC<LiveboardProps> = ({
  liveboardId,
  height = '100%',
  width = '100%',
}) => {

  return (
    <div className='liveboard-container' style={{ height, width }}>
      <LiveboardEmbed
        frameParams={{ 
            height: '100%',
            width: '100%',
        }}
        liveboardId={liveboardId}
      />
    </div>
  );
};

export default Liveboard; 