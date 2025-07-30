import React, { useEffect, useState } from 'react';
import { ProChat } from '@ant-design/pro-chat';
import { useTheme } from 'antd-style';
import { AuthType, init } from '@thoughtspot/visual-embed-sdk';
import { SpotterMessage, useSpotterAgent } from '@thoughtspot/visual-embed-sdk/react';
import { sendMessage, startAgentChat } from './service';

import './App.css';


const tokenServer = import.meta.env.VITE_TOKEN_SERVER;
const username = import.meta.env.VITE_USERNAME;
const thoughtSpotHost = import.meta.env.VITE_THOUGHTSPOT_HOST;
const tsDatasourceId = import.meta.env.VITE_TS_DATASOURCE_ID;

init({
  thoughtSpotHost,
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: async () => {
    const res = await fetch(`${tokenServer}/api/gettoken/${username}`);
    return res.text();
  }
});

function App() {
  const theme = useTheme();
  const [chatId, setChatId] = useState('');
  const [lastTSResponse, setLastTSResponse] = useState<any | null>(null);

  const { sendMessage: sendSpotterMessage } = useSpotterAgent({
    worksheetId: tsDatasourceId,
  });

  useEffect(() => {
    startAgentChat().then(({ chatId }) => setChatId(chatId));
  }, []);

  const handleMessage = async (messages: any[]) => {
    const userMessage = messages[messages.length - 1].content;
    
    try {
      const geminiResponse = await sendMessage(chatId, userMessage);
      const part = geminiResponse?.response?.candidates?.[0]?.content?.parts?.[0];

      if (part?.functionCall?.name === 'analyzeData') {
        const query = part.functionCall.args?.query;
        
        const tsResponse = await sendSpotterMessage(query);
        setLastTSResponse(tsResponse);
        return new Response(`@spotter/${Date.now()}`);
      }
      
      if (part?.text) {
        return new Response(part.text);
      }
      
      return new Response('No response from AI');
      
    } catch (error) {
      return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', background: theme.colorBgLayout }}>
      <ProChat
        loading={!chatId}
        style={{ width: '100%', height: '100%' }}
        locale="en-US"
        request={handleMessage}
        chatItemRenderConfig={{
          contentRender(props, defaultDom) {
            const message = props.message;

            if (typeof message === 'string' && message.startsWith('@spotter/') && lastTSResponse) {
              return (
                <SpotterMessage
                  message={lastTSResponse.message}
                  query={lastTSResponse.query}
                  style={{ height: "600px" }}
                />
              );
            }

            if (typeof message === 'string') return message;

            return defaultDom;
          }
        }}
      />
    </div>
  );
}

export default App;
