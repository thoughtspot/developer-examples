## React Native Embed SDK Example

**The `@thoughtspot/react-native-embed-sdk` provides a way for embedding ThoughtSpot Liveboards into your React Native applications.**

### Expo Snack
**This is a code example demonstrating how to embed ThoughtSpot Liveboards using the `@thoughtspot/react-native-embed-sdk`. Check out the live demo in the Expo Snack environment by clicking the link below, and experiment with the code!**

You can play around with the code in Expo Snack.
[Expo Snack Link]()

### Quick Start

#### Embedding a Liveboard

Here's how to embed a Liveboard in your React Native app:

```javascript
import { init, AuthType, LiveboardEmbed } from '@thoughtspot/react-native-embed-sdk';

init({
  thoughtSpotHost: 'your-ts-host',
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: async () => { // provide function to get auth token
    return "TOKEN";
  }
});

export default function App() {
  return (
      <LiveboardEmbed liveboardId="your-liveboard-id" />
  );
}
```

#### Additional Resources

* **npm Package:** [https://www.npmjs.com/package/@thoughtspot/react-native-embed-sdk](https://www.npmjs.com/package/@thoughtspot/react-native-embed-sdk)
* **GitHub Repository:** [https://github.com/@thoughtspot/react-native-embed-sdk](https://github.com/@thoughtspot/react-native-embed-sdk)
* **ThoughtSpot Documentation:** [https://developers.thoughtspot.com/](https://developers.thoughtspot.com/)
