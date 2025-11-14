# ThoughtSpot Query Decomposition

This application demonstrates the integration of ThoughtSpot with an AI agent that can analyze your data and provide insights through a conversational interface.

## Features

- Interactive chat interface with streaming responses
- Integration with ThoughtSpot data APIs
- ThoughtSpot Query decomposition APIs to decompose high level topical questions into data questions.
- Real-time data analysis and insights


## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Update the `.env` file in the root directory with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   VITE_THOUGHTSPOT_HOST=your_thoughtspot_host
   VITE_TOKEN_SERVER=your_token_server
   VITE_TS_BEARER_TOKEN=your_bearer_token (if not providing token server)
   VITE_TS_DATASOURCE_ID=your_datasource_id
   VITE_USERNAME=your_username
   ```
   See [How to get bearer token](#how-to-get-the-bearer-token)

4. Start both the frontend and backend servers:

```bash
npm run dev:all
```

Or start them separately:

```bash
# Start the backend server
npm run api

# In a new terminal, start the frontend development server
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### How to get the bearer token.
  - Go to ThoughtSpot => Develop => Rest Playground v2.0
  - Authentication => Get Full access token
  - Scroll down and expand the "body"
  - Add your "username" and "password".
  - Put whatever "validity_time" you want the token to be.
  - Click on "Try it out" on the bottom right.
  - You should get a token in the response, thats the bearer token. 


## Project Structure

- `src/` - Frontend React application
  - `components/` - React components
    - `ChatButton.tsx` - Floating chat button component
    - `ChatSidebar.tsx` - Chat sidebar with streaming responses
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point
- `api/` - Backend Express server
  - `agent.ts` - AI agent implementation with Gemini integration
  - `relevant-data.ts` - Data retrieval functions
  - `thoughtspot.ts` - ThoughtSpot API integration

## How It Works

1. When the application loads, it initializes a chat session by calling `/api/start`
2. The user can click the chat button in the bottom right corner to open the chat sidebar
3. The user can type a message and send it to the AI agent
4. The agent processes the message, retrieves relevant data from ThoughtSpot, and streams the response back to the user
5. The response is displayed in the chat interface in real-time

## Technologies Used

- React
- TypeScript
- Ant Design
- Vite
- Express
- Google Generative AI
- ThoughtSpot REST API SDK

## Documentation

- Links to the Thoughtspot developer docs for the features used in this example.
- ...

## Run locally

```
$ git clone https://github.com/thoughtspot/developer-examples
$ cd visual-embed/spotter/query-decomposition
```
```
$ npm i
```
```
$ npm run dev:all
```

### Technology labels

- React
- Typescript
- Web
