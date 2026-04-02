<!-- search-meta
tags: [query-decomposition, AI-agent, Gemini, streaming, React, TypeScript, REST-API, ThoughtSpotRestApi]
apis: [queryGetDecomposedQuery, singleAnswer, exportAnswerReport, importMetadataTML, ThoughtSpotRestApi, createBearerAuthenticationConfig, GoogleGenerativeAI]
questions:
  - How do I use ThoughtSpot query decomposition to break a question into sub-queries?
  - How do I build an AI agent that decomposes questions into ThoughtSpot data queries?
  - How do I integrate Gemini with ThoughtSpot for conversational data analysis?
  - How do I stream Gemini responses with ThoughtSpot data in a React app?
  - How do I create a ThoughtSpot liveboard programmatically from multiple answers?
  - How do I use ThoughtSpot singleAnswer and exportAnswerReport in Node.js?
-->

# ThoughtSpot Query Decomposition

A full-stack AI agent that answers business questions by decomposing them into sub-queries using the ThoughtSpot REST API, fetching data for each, and streaming a Gemini-powered analysis with an auto-generated ThoughtSpot Liveboard.

## Key Usage

```typescript
import { ThoughtSpotRestApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const thoughtSpotClient = new ThoughtSpotRestApi(
  createBearerAuthenticationConfig(THOUGHTSPOT_HOST, async () => BEARER_TOKEN)
);

// Step 1: Decompose a high-level question into answerable sub-queries
const result = await thoughtSpotClient.queryGetDecomposedQuery({
  nlsRequest: { query: "How can I increase sales?" },
  content: [],
  worksheetIds: [DATASOURCE_ID],
});
const subQuestions = result.decomposedQueryResponse?.decomposedQueries?.map(q => q.query!) ?? [];
// e.g. ["What is revenue by region?", "What are top products by sales?", ...]

// Step 2: Get answer + CSV data for each sub-question
const answer = await thoughtSpotClient.singleAnswer({
  query: subQuestion,
  metadata_identifier: DATASOURCE_ID,
});
const csvData = await thoughtSpotClient.exportAnswerReport({
  session_identifier: answer.session_identifier!,
  generation_number: answer.generation_number!,
  file_format: "CSV",
});

// Step 3: Create a Liveboard with all answers via TML import
await thoughtSpotClient.importMetadataTML({
  metadata_tmls: [JSON.stringify(liveboardTml)],
  import_policy: "ALL_OR_NONE",
});

// Step 4: Send answers to Gemini and stream the analysis back to the user
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  tools: [{ functionDeclarations: [getRelevantDataFunctionDefinition] }],
});
const chat = model.startChat();
const stream = await chat.sendMessageStream(userQuery);
for await (const chunk of stream.stream) {
  res.write(chunk.candidates[0].content.parts[0].text); // streamed to client
}
```

## Features

- Interactive streaming chat interface built with React + Ant Design
- Uses `queryGetDecomposedQuery` to break complex business questions into answerable sub-queries
- Fetches CSV data per sub-query using `singleAnswer` + `exportAnswerReport`
- Auto-creates a ThoughtSpot Liveboard from all answers and embeds it inline via `importMetadataTML`
- Gemini function-calling agent orchestrates the full flow and streams a summary with citations


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

- [ThoughtSpot REST API SDK](https://developers.thoughtspot.com/docs/rest-api-sdk)
- [queryGetDecomposedQuery (NLS Query Decomposition)](https://developers.thoughtspot.com/docs/rest-apiv2-reference#_query_decomposed_query)
- [singleAnswer API](https://developers.thoughtspot.com/docs/rest-apiv2-reference#_single_answer)
- [importMetadataTML](https://developers.thoughtspot.com/docs/rest-apiv2-reference#_import_metadata_tml)
- [Google Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)

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