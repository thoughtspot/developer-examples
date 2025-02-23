# ThoughtSpot Express Authentication Example

This example demonstrates how to integrate ThoughtSpot's REST API SDK with Express using service account authentication.

## Configuration

Create a `.env` file with the following variables:

```bash
THOUGHTSPOT_HOST=https://your-thoughtspot-host
TS_SERVICE_USERNAME=your-service-account
TS_SERVICE_SECRET=your-service-secret-key
PORT=3000
```

## Service Account Authentication

This example uses a service account with a secret key for authentication. This is more appropriate for server-side applications than username/password authentication.

### Getting a Token

```bash
curl -X POST http://localhost:3000/api/auth/token
```

### Using the Token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/thoughtspot/user
```

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
THOUGHTSPOT_HOST=https://your-thoughtspot-host
PORT=3000
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

See `src/clients/basicClient.ts` for implementation details.

### 2. Token-based Authentication

```typescript
// Initialize client with token auth
const client = getThoughtSpotCookielessClient(authToken);
```

See `src/clients/cookielessClient.ts` and `src/utils/tokenManager.ts` for token management implementation.

## Project Structure

### Authentication Clients

- `src/clients/basicClient.ts` - Cookie auth
- `src/clients/cookielessClient.ts` - Token auth
- `src/utils/tokenManager.ts` - Token management

### Core Routes

- `src/routes/auth.ts` - Authentication endpoints
- `src/routes/thoughtspot.ts` - ThoughtSpot data endpoints
- `src/middleware/auth.ts` - Auth middleware

## API Endpoints

### Authentication

- `POST /api/auth/login` - Cookie-based login
- `POST /api/auth/token` - Get auth token
- `POST /api/auth/logout` - Logout

### ThoughtSpot Data

- `GET /api/thoughtspot/user` - Get user info
- `GET /api/thoughtspot/metadata` - Get ThoughtSpot metadata
- `GET /api/thoughtspot/liveboards` - Get Liveboards

## Features

- Multiple auth methods (Cookie/Token)
- Auth middleware
- Error handling
- Token management
- Express middleware
- TypeScript support

## Resources

- [ThoughtSpot REST API Docs](https://developers.thoughtspot.com/docs/)
- [REST API SDK Reference](https://developers.thoughtspot.com/docs/rest-api-sdk)
