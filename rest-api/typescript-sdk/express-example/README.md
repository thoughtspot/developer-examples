# ThoughtSpot Express Authentication Example

This repository demonstrates how to integrate ThoughtSpot's REST API SDK with an Express.js application using service account authentication.

## 🚀 Features

- Service account authentication with a secret key
- Secure token-based authentication
- REST API client for ThoughtSpot
- Express.js server setup

## 📌 Prerequisites

- **Node.js v20+**
- **npm** or **yarn**

## 🛠 Configuration

Create a `.env` file in the project root with the following variables:

```ini
THOUGHTSPOT_HOST=https://your-thoughtspot-host
SECRET_KEY=your-secret-key
PORT=4123
```

## ⚡ Quick Start

1. **Clone the repository and install dependencies:**

   ```sh
   git clone <repository-url>
   cd express-example
   npm install
   ```

2. **Configure environment variables:**

   ```sh
   # .env file
   PORT=4123
   THOUGHTSPOT_HOST=https://your-thoughtspot-host
   SECRET_KEY=your-secret-key
   ```

3. **Start the development server:**

   ```sh
   npm run dev
   ```

## 🔑 Authentication Overview

This example uses a service account with a secret key for authentication, which is more suitable for server-side applications than username/password authentication.

To enable this authentication, follow: [Trusted Authentication with Secret Key](https://developers.thoughtspot.com/docs/trusted-auth-secret-key#trusted-auth-enable).

## 🏗 Project Structure

```
developer-examples/rest-api/typescript-sdk/express-example/
├── src/
│   ├── thoughtspot-clients/
│   │   ├── authenticatedClient.ts   # Token authentication client
│   │   ├── basicClient.ts           # Unauthenticated client for login API calls
│   ├── handlers/
│   │   ├── thoughtspot-api.ts       # API request handlers
│   ├── constants.ts                 # Constants and configurations
│   ├── app.ts                       # Main server entry point
├── .env.example                      # Environment variable template
├── package.json
└── README.md
```

## 📡 Authentication Implementation

### 1. Token-based Authentication

To initialize the ThoughtSpot client using token authentication:

```typescript
const client = getThoughtSpotCookielessClient(authToken);
```

The token management implementation is in `src/thoughtspot-clients/authenticatedClient.ts`.

### 2. Getting an Authentication Token

We generate a full access token using the configured secret key.

```http
POST /api/rest/2.0/auth/token/full
```

### 3. Using the Token

```typescript
export const getAuthenticatedClient = (token: string) => {
  const config = createBearerAuthenticationConfig(THOUGHTSPOT_HOST, async () => token);
  return new ThoughtSpotRestApi(config);
};
```

We import authentication utilities from the ThoughtSpot REST API SDK:

```typescript
import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";
```

This will provide an authenticated client that uses the provided token for all API requests to ThoughtSpot.

## 🌐 API Endpoints

The available API endpoints:

```http
GET /api/user             # Fetch user details
GET /api/metadata         # Retrieve metadata
GET /api/answer/:answerId # Get a specific answer
GET /api/liveboard/:liveboardId # Get liveboard details
GET /api/search           # Perform a search
```

## 📚 Resources

- [ThoughtSpot REST API Docs](https://developers.thoughtspot.com/docs/)
- [REST API SDK Reference](https://developers.thoughtspot.com/docs/rest-api-sdk)

---

💡 *This project is for demonstration purposes. Ensure proper security measures when deploying in production.*

