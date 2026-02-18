# OpenAI Responses API with ThoughtSpot MCP Server

This example demonstrates how to use the OpenAI TypeScript/Node.js SDK with the ThoughtSpot MCP (Model Context Protocol) server. It shows how to integrate ThoughtSpot's data analysis and visualization capabilities as a tool within OpenAI's Responses API.

## Overview

The example makes an API call to OpenAI's Responses API, configuring the ThoughtSpot MCP server as an available tool. The AI can then interact with ThoughtSpot to perform data analysis tasks.

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn package manager
- OpenAI API key
- ThoughtSpot instance with:
  - Host URL
  - Authentication token (Bearer token)

## Installation

1. Install dependencies:

```bash
npm install
```

This will install:
- `openai` - OpenAI TypeScript SDK
- `dotenv` - Environment variable management
- `tsx` - TypeScript execution (dev dependency)

## Configuration

1. Copy the environment template file:

```bash
cp env.template .env
```

2. Edit the `.env` file with your credentials:

```env
OPENAI_API_KEY=your_openai_api_key_here
TS_HOST=your-instance.thoughtspot.cloud
TS_AUTH_TOKEN=your_thoughtspot_bearer_token
```

### Getting Your Credentials

- **OPENAI_API_KEY**: Get this from your [OpenAI API dashboard](https://platform.openai.com/api-keys)
- **TS_HOST**: Your ThoughtSpot instance hostname (e.g., `company.thoughtspot.cloud`)
- **TS_AUTH_TOKEN**: Generate a bearer token from your ThoughtSpot instance

## Usage

Run the example:

```bash
npx tsx index.ts
```

## What It Does

The script:

1. Initializes the OpenAI client with your API key
2. Configures the ThoughtSpot MCP server as a tool with:
   - Server endpoint: `https://agent.thoughtspot.app/bearer/mcp`
   - Authentication headers (Bearer token and ThoughtSpot host)
   - Allowed tools: `ping` (for demonstration)
3. Sends a streaming request to OpenAI with:
   - System prompt defining the assistant's role
   - User prompt: "Ping ThoughtSpot"
   - Reasoning effort set to "low"
4. Streams and logs the response events

## Key Features

- **MCP Integration**: Demonstrates how to integrate external tools via MCP protocol
- **Streaming Responses**: Uses OpenAI's streaming API for real-time responses
- **Authentication**: Shows proper header configuration for ThoughtSpot authentication
- **Tool Approval**: Configured with `require_approval: 'never'` for automated tool execution

## Customization

### Using Azure OpenAI

Uncomment and configure the `baseURL` in the client initialization:

```typescript
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://your-resource.openai.azure.com/openai/v1',
});
```

### Changing the Model

Modify the `model` parameter in the request:

```typescript
model: 'gpt-4', // or 'gpt-4-turbo', 'gpt-3.5-turbo', etc.
```

### Adding More Tools

Expand the `allowed_tools` array to enable more ThoughtSpot capabilities:

```typescript
allowed_tools: ['ping', 'search_answers', 'get_liveboard', 'execute_search'],
```

## Troubleshooting

### Error: OPENAI_API_KEY not found

Make sure you've created a `.env` file with your OpenAI API key.

### Authentication errors with ThoughtSpot

Verify that:
- Your `TS_AUTH_TOKEN` is valid and not expired
- Your `TS_HOST` is correct (without https:// prefix)
- Your token has appropriate permissions

### Network errors

If you're behind a proxy, you may need to configure proxy settings in the OpenAI client.

## Learn More

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [ThoughtSpot Developer Documentation](https://developers.thoughtspot.com)
- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io)

## License

See the main repository LICENSE file for details.



