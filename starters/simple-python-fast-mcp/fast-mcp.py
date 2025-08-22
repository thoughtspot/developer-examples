import os
from dotenv import load_dotenv
import asyncio
from fastmcp import Client
from fastmcp.client.auth import BearerAuth

load_dotenv()

# Replace with your actual authentication token (bearer) and ThoughtSpot instance URL
TS_AUTH_TOKEN = os.getenv("TS_AUTH_TOKEN")
TS_HOST = os.getenv("TS_HOST")
TS_MCP_URL = "https://agent.thoughtspot.app/bearer/mcp"

async def main():
    # MCP server URL for ThoughtSpot with bearer token support

    # Initialize the client with the MCP server URL
    client = Client({
        "mcpServers": {
            "thoughtspot": {
                "transport": "http",
                "url": TS_MCP_URL,
                "auth": BearerAuth(f"{TS_AUTH_TOKEN}@{TS_HOST}")
            }
        }
    })

    async with client:
        # Ping the server to ensure connectivity
        await client.ping()
        print("Connected to ThoughtSpot MCP server.")

        # List available tools
        tools = await client.list_tools()
        print("Available tools:", [tool.name for tool in tools])

        # List available resources
        resources = await client.list_resources()
        print("Available resources:", [res.uri for res in resources])

        # Example: call a tool
        try:
            result = await client.call_tool("ping")
            print("Tool result:", result)
        except Exception as e:
            print("Error calling tool:", e)

        # Optionally: read a resource (if any)
        if resources:
            resource = resources[0]
            content = await client.read_resource(resource.uri)
            print(f"Content of {resource.uri}:", content)

if __name__ == "__main__":
    asyncio.run(main())