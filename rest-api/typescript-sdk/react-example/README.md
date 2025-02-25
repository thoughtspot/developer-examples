# ThoughtSpot React Authentication Example 🚀

This example demonstrates how to integrate ThoughtSpot's REST API SDK (`@thoughtspot/rest-api-sdk`) with React, showcasing both cookie-based and token-based authentication approaches.

## Prerequisites 🛠

```bash
Node.js v20+
npm
```

## Quick Start ⚡

1. Clone and install dependencies:

```bash
git clone https://github.com/thoughtspot/developer-examples.git
cd rest-api/typescript-sdk/react-example
pnpm install
```

2. Configure environment:

```bash
# .env
VITE_THOUGHTSPOT_HOST=https://your-thoughtspot-host
```

3. Start development:

```bash
pnpm run dev
```

## Authentication Examples 🔐

### 1. Cookie-based Authentication 🍪

```typescript
// Get the basic client and login
const client = getThoughtspotBasicClient();
await client.login({ username, password });
```

See `src/thoughtspot-clients/basicClient.ts` for implementation details.

### 2. Token-based Authentication 🔑

```typescript
// Initialize client with token auth
initializeThoughtSpotCookielessClient({ username, password });
const client = getThoughtSpotCookielessClient();
```

See `src/thoughtspot-clients/authenticatedClient.ts` and `src/apis/getAuthToken.ts` for token management implementation.

## Cookie vs. Cookieless Authentication 🔍

| Feature                | Cookie-Based Authentication 🍪 | Cookieless Authentication 🔑 |
|------------------------|--------------------------------|------------------------------|
| **Session Handling**   | Session is automatically managed via browser cookies. | Each request requires explicit authentication handling. |
| **Security**           | Less secure, as cookies can be hijacked. | More secure, as tokens are short-lived and manually handled. |
| **Persistence**        | Remains logged in until session expires or is manually logged out. | Tokens must be refreshed or re-authenticated for each session. |
| **Ease of Use**        | Easier, since the browser manages cookies. | More control over authentication flow, but requires additional handling. |

## Project Structure 📂

### Authentication Clients

- `src/thoughtspot-clients/basicClient.ts` - Cookie auth
- `src/thoughtspot-clients/authenticatedClient.ts` - Token auth

### Core API

- `src/apis/getAuthToken.ts` - Handles token retrieval and caching

### UI Components 🖥

- `src/components/Layout.tsx` - Application layout
- `src/components/ProtectedRoute.tsx` - Authentication guard
- `src/components/ErrorBoundary.tsx` - Error handling
- `src/components/ErrorAlert.tsx` - Error alerts
- `src/components/LoadingSpinner.tsx` - Loading indicator
- `src/components/UserCard.tsx` - User information display

### Pages 📜

- `src/pages/loginPage.tsx` - Login screen
- `src/pages/dashboardPage.tsx` - Protected dashboard

### Other Files

- `src/App.tsx` - Main application entry point
- `src/main.tsx` - Renders the React app
- `src/constant.ts` - Constants
- `vite.config.ts` - Vite configuration

## Features ✨

- ✅ Cookie-based and token-based authentication
- ✅ Protected routes
- ✅ Error handling with boundary components
- ✅ TypeScript support
- ✅ ThoughtSpot API integration

## Resources 📖

- [ThoughtSpot REST API Docs](https://developers.thoughtspot.com/docs/)
- [REST API SDK Reference](https://developers.thoughtspot.com/docs/rest-api-sdk)

## Using the Application 🚀

### Login Page 🔐
<img width="766" alt="Screenshot 2025-02-24 at 1 42 45 AM" src="https://github.com/user-attachments/assets/e595100a-1952-4e00-aa22-b54ab70d8dbc" />

The login page offers two authentication methods:

- **Token Login**: Uses token-based (cookieless) authentication
- **Cookie Login**: Uses traditional cookie-based authentication

Enter your ThoughtSpot credentials and choose either method to log in.

### Dashboard 📊

#### Cookie Dashboard (`/cookie/dashboard`)
<img width="613" alt="Screenshot 2025-02-24 at 1 57 13 AM" src="https://github.com/user-attachments/assets/458c2e2e-a9b2-4242-bbec-09961135d94a" />

<img width="1727" alt="Screenshot 2025-02-24 at 1 59 23 AM" src="https://github.com/user-attachments/assets/8141454a-fc3d-49ba-8081-3dbc462e1300" />
- Uses cookie-based authentication
- Session persists in browser cookies
- Automatically handles session management
- Access at `/cookie/dashboard`

#### Cookieless Dashboard (`/cookieless/dashboard`)
<img width="1728" alt="Screenshot 2025-02-24 at 1 57 24 AM" src="https://github.com/user-attachments/assets/6f98e366-12ab-48ba-87e0-d58f1d5f458f" />

- Uses token-based authentication
- Manages authentication tokens in memory
- Implements token caching and refresh
- Access at `/cookieless/dashboard`

Both dashboards display:

- User information
- ThoughtSpot metadata (Liveboards & Answers)
- Authentication type indicator
- Logout functionality

