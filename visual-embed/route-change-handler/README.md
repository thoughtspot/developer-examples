# Route Change Handler Example

This example demonstrates how to handle route changes in ThoughtSpot embedded analytics and fetch liveboard metadata using the Visual Embed SDK.

## Features

- Subscribes to route change events in ThoughtSpot embedded analytics
- Extracts liveboard IDs from URLs
- Fetches liveboard metadata using the REST API
- Displays liveboard names using toast notifications

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your ThoughtSpot instance:

   - Open `src/App.tsx`
   - Replace `https://your-thoughtspot-instance.com` with your ThoughtSpot instance URL
   - Update the `authType` in the `init` configuration based on your authentication method

3. Start the development server:

```bash
npm run dev
```

## Documentation

- [Visual Embed SDK Documentation](https://developers.thoughtspot.com/docs/visual-embed-sdk)
- [REST API Documentation](https://developers.thoughtspot.com/docs/rest-apis)

## Live Demo

[View this example on CodeSandbox](https://githubbox.com/thoughtspot/developer-examples/tree/main/visual-embed/route-change-handler)
