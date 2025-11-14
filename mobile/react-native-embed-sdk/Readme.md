## React Native Embed SDK Example

**The `@thoughtspot/react-native-embed-sdk` provides a way for embedding ThoughtSpot Liveboards into your React Native applications.**

### Expo Snack

**This is a code example demonstrating how to embed ThoughtSpot Liveboards using the `@thoughtspot/react-native-embed-sdk`. Check out the live demo in the Expo Snack environment by clicking the link below, and experiment with the code!**

You can play around with the code in Expo Snack:
[Expo Snack Link](https://snack.expo.dev/@git/github.com/thoughtspot/developer-examples:mobile/react-native-embed-sdk)

#### Note on Local Development

The code within this `developer-examples` repository is pre-configured for the online Expo Snack environment linked above.

If you want to integrate the SDK into your own local React Native application:

1.  **Create a new Expo project** (if you don't have one):
    ```bash
    # Creates a minimal Expo project using TypeScript (Recommended)
    npx create-expo-app my-thoughtspot-app --template blank-typescript
    cd my-thoughtspot-app

    # Alternatively, create a standard project (might use JavaScript or include routing):
    # npx create-expo-app my-thoughtspot-app
    # cd my-thoughtspot-app
    ```

2.  **Install the SDK:** Follow the [Installation](#installation) steps below to add the SDK to your project.

3.  **Install Peer Dependency:** The ThoughtSpot SDK requires `react-native-webview`. Install it if you haven't already:
    ```bash
    npx expo install react-native-webview
    ```

4.  **Integrate into your App:** Modify your main app file to initialize the SDK and embed the `LiveboardEmbed` component.
    *   If you used the recommended `--template blank-typescript`, this will likely be `App.tsx`.
    *   If you created a standard JavaScript project, this might be `App.js`.
    *   If your project uses Expo Router (often included in templates other than `blank`), you might need to modify `app/_layout.tsx` or `app/_layout.js`.

    **Example (using TypeScript, suitable for `App.tsx` or `app/_layout.tsx`):**
    ```typescript
    // In your main app component file (e.g., App.tsx)
    import React from 'react';
    import { View, StyleSheet } from 'react-native';
    import { AuthType, init, LiveboardEmbed } from '@thoughtspot/react-native-embed-sdk';

    // --- ThoughtSpot Initialization ---
    // Initialize ThoughtSpot SDK once when the app loads.
    init({
      // Replace with your ThoughtSpot instance URL
      thoughtSpotHost: 'your-ts-host',
      // Specify the authentication type
      authType: AuthType.TrustedAuthTokenCookieless,
      // Provide an async function that returns a valid auth token
      // IMPORTANT: Replace this with your actual secure token fetching logic!
      getAuthToken: async () => {
         // Example: Fetch token from your backend
         // const response = await fetch('https://your-backend.com/api/get-ts-token');
         // const data = await response.json();
         // return data.token;
         return "YOUR_AUTH_TOKEN"; // Replace with actual token retrieval
      }
    });
    // --- End ThoughtSpot Initialization ---


    export default function App() { // Or your RootLayout component name
      // You might have other app setup logic here

      return (
        // Example: Using a simple View. Integrate <LiveboardEmbed>
        // within your existing component structure.
        <View style={styles.container}>
          {/* Your other app components might go here */}

          {/* Embed the ThoughtSpot Liveboard */}
          <LiveboardEmbed
            // Replace with the ID of the Liveboard you want to embed
            liveboardId="your-liveboard-id"
            // Optional: Add frameParams for other customizations if needed
            // frameParams={{ /* ... other params ... */ }}
          />
        </View>
      );
    }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            // Adjust padding as needed for your app's header/navigation
            paddingTop: 50, // Example padding
            paddingBottom: 10,
            paddingLeft: 10,
            paddingRight: 10,
          }
     });
    ```
    *(This example shows the basic structure. You'll need to adapt the initialization options and Liveboard ID. If using JavaScript, remove the TypeScript type annotations.)*

5.  **Replace Placeholders:** Remember to replace `your-ts-host`, `YOUR_AUTH_TOKEN`, and `your-liveboard-id` in the code with your actual ThoughtSpot environment details and authentication mechanism.

### Installation

Add the SDK to your project using your preferred package manager:

*   **npm:**
    ```bash
    npm install @thoughtspot/react-native-embed-sdk
    ```
*   **yarn:**
    ```bash
    yarn add @thoughtspot/react-native-embed-sdk
    ```
*   **pnpm:**
    ```bash
    pnpm add @thoughtspot/react-native-embed-sdk
    ```

### Quick Start

Here's how to embed a Liveboard in your React Native app:

1.  **Initialize the SDK:** Call the `init` function once, typically in your app's entry point.

    ```javascript
    import { init, AuthType } from '@thoughtspot/react-native-embed-sdk';

    init({
      // Replace with your ThoughtSpot instance URL
      thoughtSpotHost: 'your-ts-host',
      // Specify the authentication type (TrustedAuthTokenCookieless is common)
      authType: AuthType.TrustedAuthTokenCookieless,
      // Provide an async function that returns a valid auth token
      getAuthToken: async () => {
        // Replace this with your actual token fetching logic
        return "YOUR_AUTH_TOKEN";
      }
    });
    ```

2.  **Embed the Liveboard Component:** Use the `LiveboardEmbed` component where you want the Liveboard to appear.

    ```javascript
    import React from 'react';
    import { LiveboardEmbed } from '@thoughtspot/react-native-embed-sdk';

    export default function App() {
      return (
          <LiveboardEmbed
            // Replace with the ID of the Liveboard you want to embed
            liveboardId="your-liveboard-id"
          />
      );
    }
    ```

### Additional Resources

*   **npm Package:** [https://www.npmjs.com/package/@thoughtspot/react-native-embed-sdk](https://www.npmjs.com/package/@thoughtspot/react-native-embed-sdk)
*   **GitHub Repository:** [https://github.com/thoughtspot/react-native-mobile-sdk](https://github.com/thoughtspot/react-native-mobile-sdk)
*   **ThoughtSpot Developer Documentation:** [https://developers.thoughtspot.com/](https://developers.thoughtspot.com/)