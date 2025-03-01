import React from 'react'
import { ProChat } from '@ant-design/pro-chat';
import { Flexbox } from 'react-layout-kit';
import { useTheme } from 'antd-style';
import { AuthType, init } from '@thoughtspot/visual-embed-sdk';

import { SpotterMessage } from './thoughtspot';

import './App.css'
import { sendMessage, startAgentChat } from './service';

function App() {
  const theme = useTheme();
  const [chatId, setChatId] = React.useState("");

  React.useEffect(() => {
    startAgentChat().then(({chatId}) => {
      setChatId(chatId);
    });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: theme.colorBgLayout }}>
      <ProChat
        loading={!chatId}
        style={{ width: '100%', height: '100%' }} 
        locale="en-US"
        chatItemRenderConfig={{
          contentRender(props, defaultDom) {
            try {
              const message = JSON.parse(props.message);
              const part = message.response.candidates[0].content.parts[0];
              if (part.functionCall) {
                const { functionCall } = part;
                if (functionCall.name === 'analyzeData') {
                  return <SpotterMessage query={functionCall.args.query} />;
                }
              } else {
                return part.text;
              }
            } catch (e) {
              
            }
            // const msg = JSON.parse(props.message);
            return defaultDom;
          },
        }}
        request={async (messages) => {
          return sendMessage(chatId, messages[messages.length - 1].content);
        }}
      ></ProChat>
    </div>
  )
}

export default App
