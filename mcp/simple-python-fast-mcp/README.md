# Simple Python FastMCP Example

This example demonstrates how to use the FastMCP Python client to connect to ThoughtSpot's Model Context Protocol (MCP) server. It provides a basic implementation that shows how to authenticate, connect, and interact with the MCP server.

## What is FastMCP?

FastMCP is a Python client library for the Model Context Protocol (MCP), which enables AI assistants to interact with external tools and data sources. This example specifically shows how to connect to ThoughtSpot's MCP server using bearer token authentication.

## Features

- **Bearer Token Authentication**: Secure connection to ThoughtSpot MCP server
- **Server Connectivity**: Ping the server to verify connection
- **Tool Discovery**: List available tools and resources
- **Tool Execution**: Execute MCP tools (example with ping)
- **Resource Reading**: Read available resources from the server

## Prerequisites

- Python 3.8 or higher
- ThoughtSpot instance with MCP server enabled
- Valid authentication token for your ThoughtSpot instance

## Installation

1. **Clone or navigate to this directory:**
   ```bash
   cd starters/simple-python-fast-mcp
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. **Create a `.env` file** in the project directory with your ThoughtSpot credentials:
   ```env
   TS_AUTH_TOKEN=your_bearer_token_here
   TS_HOST=your_thoughtspot_instance_url
   ```

   **Note:** The `TS_HOST` should be your ThoughtSpot instance URL (e.g., `https://your-instance.thoughtspot.com`)
   You can get a TS_AUTH_TOKEN by following these [steps](https://github.com/thoughtspot/mcp-server?tab=readme-ov-file#how-to-obtain-a-ts_auth_token-).

2. **Update the MCP server URL** in `fast-mcp.py` if needed:
   ```python
   TS_MCP_URL = "https://agent.thoughtspot.app/bearer/mcp"
   ```

## Usage

Run the example script:

```bash
python fast-mcp.py
```

The script will:
1. Connect to the ThoughtSpot MCP server using your credentials
2. Ping the server to verify connectivity
3. List available tools and resources
4. Execute a sample tool call (ping)
5. Read the first available resource (if any)

## Expected Output

```
Connected to ThoughtSpot MCP server.
Available tools: [list of available tool names]
Available resources: [list of available resource URIs]
Tool result: [result of the ping tool]
Content of [resource_uri]: [resource content]
```

## Code Structure

The main script (`fast-mcp.py`) demonstrates:

- **Environment Configuration**: Loading credentials from `.env` file
- **Client Initialization**: Setting up the FastMCP client with ThoughtSpot server details
- **Authentication**: Using bearer token authentication
- **Server Interaction**: Basic operations like ping, listing tools/resources, and tool execution

## Customization

You can modify the script to:

- Call specific tools available on your ThoughtSpot MCP server
- Read specific resources
- Implement more complex workflows
- Add error handling and retry logic

## Troubleshooting

**Common Issues:**

1. **Authentication Error**: Verify your `TS_AUTH_TOKEN` is valid and not expired
2. **Connection Error**: Check that `TS_HOST` is correct and accessible
3. **Import Error**: Ensure all dependencies are installed in your virtual environment
4. **Permission Error**: Verify your token has the necessary permissions for MCP operations

**Debug Mode:**
Add logging to see detailed connection information:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Dependencies

- `fastmcp==2.11.3`: The main FastMCP client library
- `python-dotenv==0.9.9`: Environment variable management
- `asyncio`: Asynchronous I/O support (built-in with Python 3.7+)

## Learn More

- [FastMCP Documentation](https://github.com/fastmcp/fastmcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [ThoughtSpot Developer Documentation](https://developers.thoughtspot.com/)

## License

This example is provided as-is for educational purposes. Please refer to the main project license for usage terms.
