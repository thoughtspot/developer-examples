# ThoughtSpot Express Authentication Example

This example demonstrates how to integrate ThoughtSpot's REST API SDK with Express using service account authentication.

## Configuration

Create a `.env` file with the following variables:

```bash
THOUGHTSPOT_HOST=https://your-thoughtspot-host
SECRET_KEY=your-secret-key
PORT=4123
```

## Service Account Authentication

This example uses a service account with a secret key for authentication. This is more appropriate for server-side applications than username/password authentication.

Follow this to enable: [Trusted Authentication with Secret Key](https://developers.thoughtspot.com/docs/trusted-auth-secret-key#trusted-auth-enable)

## Prerequisites

```bash
Node.js v20+
npm/yarn
```

## Quick Start

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd express-example
npm install
```

2. Configure environment:

```bash
# .env
PORT=4123
THOUGHTSPOT_HOST=https://your-thoughtspot-host
SECRET_KEY=your-secret-key
```

3. Start development:

```bash
npm run dev
```

## Authentication Examples

### 1. Token-based Authentication

```typescript
// Initialize client with token auth
const client = getThoughtSpotCookielessClient(authToken);
```

See `src/thoughtspot-clients/authenticatedClient.ts` for token management implementation.

### Getting a Token

We use the above secret key to generate a full access token for the user to make calls to ThoughtSpot's APIs.

```http
POST /api/rest/2.0/auth/token/full
```

### Using the Token

```typescript
export const getAuthenticatedClient = (token: string) => {
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, async () => token);
  return new ThoughtSpotRestApi(config);
};
```

We pass the token to `createBearerAuthenticationConfig` from:

```typescript
import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";
```

This will give us an authenticated client that will use the provided token for all requests to ThoughtSpot.

## Project Structure

### Authentication Clients

- `src/thoughtspot-clients/authenticatedClient.ts` - Token authentication client
- `src/utils/tokenManager.ts` - Token management utility

### Core Routes

- `src/routes/auth.ts` - Authentication endpoints
- `src/routes/thoughtspot.ts` - ThoughtSpot data endpoints
- `src/middleware/auth.ts` - Authentication middleware

## API Endpoints

These are the API endpoints available:

```http
GET /api/user
GET /api/metadata
GET /api/answer/:answerId
GET /api/liveboard/:liveboardId
GET /api/search
```

## Resources

- [ThoughtSpot REST API Docs](https://developers.thoughtspot.com/docs/)
- [REST API SDK Reference](https://developers.thoughtspot.com/docs/rest-api-sdk)

