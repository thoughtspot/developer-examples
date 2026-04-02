<!-- search-meta
tags: [cookieless-auth, TrustedAuthTokenCookieless, AppEmbed, React, TypeScript, authentication, trusted-auth]
apis: [AppEmbed, AuthType, useInit, AuthStatus, TrustedAuthTokenCookieless, getAuthToken]
questions:
  - How do I implement cookieless authentication for ThoughtSpot embed?
  - How do I use TrustedAuthTokenCookieless auth type in ThoughtSpot?
  - How do I embed ThoughtSpot without third-party cookies?
  - How do I set up token-based authentication for ThoughtSpot embed?
  - How do I handle token refresh in ThoughtSpot cookieless auth?
-->

# cookieless-embed

This example demonstrates how to implement cookieless authentication for embedding ThoughtSpot using the Visual Embed SDK.

## Key Usage

```typescript
import { AppEmbed, AuthType, useInit, AuthStatus } from "@thoughtspot/visual-embed-sdk/react";

const getAuthToken = async (): Promise<string> => {
  // Fetch a short-lived token from your backend
  const response = await fetch("/api/thoughtspot-token");
  return response.text();
};

const App = () => {
  const authEE = useInit({
    thoughtSpotHost: "https://your-instance.thoughtspot.cloud",
    authType: AuthType.TrustedAuthTokenCookieless, // no third-party cookies needed
    getAuthToken,
  });

  useEffect(() => {
    authEE.current?.on(AuthStatus.SDK_SUCCESS, () => {
      console.log("Cookieless auth successful");
    });
  }, []);

  return <AppEmbed />;
};
```

## Demo

Open in [Codesandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/auth/cookieless)

## Documentation

- [Cookieless Authentication Examples](https://developers.thoughtspot.com/docs/trusted-auth-sdk#_cookieless_authentication_examples)

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/auth/cookieless
```
```
$ npm i
```
```
$ npm run dev
```

## Code Structure

### Source Code
```
src
├── App.tsx    -> Contains the embed code using @thoughtspot/visual-embed-sdk
├── services
│   └── token.ts  -> Handles fetching auth token from backend
```

## Technology labels

- React
- Typescript
- Web