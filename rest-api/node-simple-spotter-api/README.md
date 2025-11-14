# Node Simple Spotter API Examples

This folder contains two example implementations demonstrating how to interact with ThoughtSpot's Spotter AI API using Node.js and TypeScript. Both examples show how to create an AI conversation, send a natural language query, and export the results as CSV.

## Files Overview

- **`with-sdk.ts`** - Uses the official ThoughtSpot REST API SDK (recommended approach)
- **`no-sdk.ts`** - Makes direct REST API calls using native fetch (without SDK)

## Prerequisites

- Node.js (v18 or higher recommended)
- A ThoughtSpot instance with Spotter AI enabled
- A valid Bearer token for authentication
- A Data Source ID (metadata identifier) to query against

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file in this directory with the following variables:
   ```bash
   THOUGHTSPOT_HOST=https://your-instance.thoughtspot.cloud
   BEARER_TOKEN=your_bearer_token_here
   DATA_SOURCE_ID=your_data_source_id
   ```

   Replace the values with your actual ThoughtSpot instance details.

## Running the Examples

### Option 1: Using the SDK (Recommended)

```bash
npx tsx with-sdk.ts
```

This approach uses the `@thoughtspot/rest-api-sdk` package, which provides:
- Type-safe API calls
- Simplified authentication configuration
- Better error handling
- Cleaner, more maintainable code

### Option 2: Without SDK

```bash
npx tsx no-sdk.ts
```

This approach makes direct REST API calls using native fetch. It's useful for:
- Understanding the underlying API structure
- Environments where you cannot use the SDK
- Learning how the REST endpoints work

## What the Examples Do

Both examples perform the same workflow:

1. **Create a Conversation** - Initializes a new AI conversation session with a specific data source
2. **Send a Message** - Sends a natural language query ("revenue by region") to the AI
3. **Export Results** - Retrieves the generated answer as CSV data and prints it to console

## Expected Output

When you run either example successfully, you should see CSV data output to the console, containing the revenue breakdown by region based on your data source.

Example output:
```
Exported by user@domain.com at 10/05/2025
Filters:
Column = value

Region,Revenue
North,1234567
South,2345678
East,3456789
West,4567890
```

### Remove the CSV header

Ask the ThoughtSpot support to run the flag to remove the header from the exported CSVs using system cli. The flag is called `removeCSVHeader`.

## API Endpoints Used

- `POST /api/rest/2.0/ai/conversation/create` - Creates a new conversation
- `POST /api/rest/2.0/ai/conversation/{id}/converse` - Sends a message to the conversation
- `POST /api/rest/2.0/report/answer` - Exports the answer report in the specified format

## Troubleshooting

- **Authentication errors**: Verify your `BEARER_TOKEN` is valid and not expired
- **Data source errors**: Ensure the `DATA_SOURCE_ID` exists and you have access to it
- **Connection errors**: Check that `THOUGHTSPOT_HOST` is correctly formatted with the protocol (https://)

## Learn More

- [ThoughtSpot REST API Documentation](https://developers.thoughtspot.com/docs/rest-apiv2-reference)
- [ThoughtSpot REST API SDK](https://www.npmjs.com/package/@thoughtspot/rest-api-sdk)
- [Spotter Tutorial](https://developers.thoughtspot.com/docs/tutorials/spotter/integrate-into-chatbot)

