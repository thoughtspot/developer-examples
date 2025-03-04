// src/main.ts

import './style.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';

const jsCodeToHighlight = `
import { init, AuthType, LiveboardEmbed, HostEvent } from '@thoughtspot/react-native-mobile-sdk';

init({
  thoughtSpotHost: 'https://your-thoughtspot-host.com',
  username: 'your-username',
  AuthType: AuthType.TrustedAuthTokenCookieless
  getAuthToken: async () => {
    return 'your-auth-token';
  }
});

const App = () => {
  const liveboardRef = useRef(null);

  const reloadLiveboard = () => {
    if(liveboardRef.current) {
      liveboardRef.current.trigger(HostEvent.Reload);
    }
  }
  return (
    <View>
      <Button title="Reload Liveboard" onPress={reloadLiveboard} />
      <LiveboardEmbed
        ref = {liveboardRef}
        liveboardId="your-liveboard-id"
        onAuthInit={() => {
          console.log('Auth initialized');
        }}
        hideLiveboardTitle={true}
      />
    </View>
  );
};
`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <pre><code class="language-javascript">${hljs.highlight(jsCodeToHighlight, { language: 'jsx' }).value}</code></pre>
  </div>
`;

const initialScreen = document.getElementById('initial-screen')!;
const appContainer = document.getElementById('app-container')!;
const startButton = document.getElementById('start-button')!;

startButton.addEventListener('click', () => {
    initialScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    appContainer.style.flexDirection = 'column';
    appContainer.style.backgroundColor = 'rgb(201, 211, 209)';
    appContainer.style.gap = '10px';
});