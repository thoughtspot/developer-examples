# ThoughtSpot React Authentication Example

This example demonstrates how to integrate ThoughtSpot's REST API SDK (`@thoughtspot/rest-api-sdk`) with React showcasing both cookie-based and token-based authentication approaches.

## Prerequisites

```bash
Node.js v20+
npm/yarn
```

## Quick Start

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd react-example
npm install
```

2. Configure environment:

```bash
# .env
VITE_THOUGHTSPOT_HOST=https://your-thoughtspot-host
```

3. Start development:

```bash
npm run dev
```

## Authentication Examples

### 1. Cookie-based Authentication

```typescript
// Get the basic client and login
const client = getThoughtspotBasicClient();
await client.login({ username, password });
```

See `src/thoughtspot-clients/basicClient.ts` for implementation details.

### 2. Token-based Authentication

```typescript
// Initialize client with token auth
initializeThoughtSpotCookielessClient({ username, password });
const client = getThoughtSpotCookielessClient();
```

See `src/thoughtspot-clients/cookielessClient.ts` and `src/apis/getAuthToken.ts` for token management implementation.

## Project Structure

### Authentication Clients

- `src/thoughtspot-clients/basicClient.ts` - Cookie auth
- `src/thoughtspot-clients/cookielessClient.ts` - Token auth
- `src/apis/getAuthToken.ts` - Token caching

### Core Components

- `src/App.tsx` - Main routing
- `src/pages/loginPage.tsx` - Auth UI
- `src/pages/dashboardPage.tsx` - Protected content
- `src/components/ProtectedRoute.tsx` - Auth guard
- `src/components/ErrorBoundary.tsx` - Error handling

## Features

- Multiple auth methods (Cookie/Token)
- Protected routes
- Error boundaries
- ThoughtSpot data display
- Material UI components
- TypeScript support

## Resources

- [ThoughtSpot REST API Docs](https://developers.thoughtspot.com/docs/)
- [REST API SDK Reference](https://developers.thoughtspot.com/docs/rest-api-sdk)

## Using the Application

### Login Page

The login page offers two authentication methods:

- **Token Login**: Uses token-based (cookieless) authentication
- **Cookie Login**: Uses traditional cookie-based authentication

Enter your ThoughtSpot credentials and choose either method to log in.

### Dashboards

The app demonstrates two different dashboard implementations:

#### Cookie Dashboard (`/cookie/dashboard`)

- Uses cookie-based authentication
- Session persists in browser cookies
- Automatically handles session management
- Access at `/cookie/dashboard`

#### Cookieless Dashboard (`/cookieless/dashboard`)

- Uses token-based authentication
- Manages authentication tokens in memory
- Implements token caching and refresh
- Access at `/cookieless/dashboard`

Both dashboards display:

- User information
- ThoughtSpot metadata (Liveboards & Answers)
- Authentication type indicator
- Logout functionality
