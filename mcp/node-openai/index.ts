/**
 * OpenAI Responses API Example with ThoughtSpot MCP Server
 * This script demonstrates how to use the OpenAI TypeScript/Node.js SDK
 * to make API calls with the ThoughtSpot MCP server as a tool.
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the OpenAI client
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables. Please set it in your .env file.');
  }

  const client = new OpenAI({
    apiKey: apiKey,
    // baseURL: 'https://embrace-ai-insights.openai.azure.com/openai/v1', // for Azure OpenAI
  });

  try {
    console.log('Sending request to OpenAI Responses API with ThoughtSpot MCP server...\n');

    // Get configuration from environment variables
    
    // Prepare headers
    // Make a call to the responses API with MCP tool
    const responseStream = await client.responses.stream({
      model: 'gpt-5-mini',
      tools: [
        {
          type: 'mcp',
          server_label: 'ThoughtSpot',
          server_description: 'Data analysis and visualization tool',
          server_url: "https://agent.thoughtspot.app/bearer/mcp",
          require_approval: 'never',
          headers: {
            "Authorization": `Bearer ${process.env.TS_AUTH_TOKEN}`,
            "x-ts-host": process.env.TS_HOST,
          },
          allowed_tools: ['ping'],
        },
      ],
      input: [{
        role: 'system',
        content: [{
          type: 'input_text',
          text: 'You are a helpful assistant that can help with data analysis and visualization.',
        }],
      },
        {
        role: 'user',
        content: [{
          type: 'input_text',
          text: 'Ping ThoughtSpot',
        }],
      }],
      reasoning: {
        "effort": "low",
      }
    });

    for await (const event of responseStream) {
        console.log(event);
    }

  } catch (error) {
    console.error('Error making API call:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

// Run the main function
main().catch(console.error);

