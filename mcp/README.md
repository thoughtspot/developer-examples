# Model Context Protocol (MCP) Examples

This directory contains examples and implementations related to the **Model Context Protocol (MCP)**, a standardized way for AI models to interact with external data sources and tools. These examples specifically demonstrate how to use the [ThoughtSpot MCP Server](https://github.com/thoughtspot/mcp-server) to connect AI models with ThoughtSpot analytics data.

## What is Model Context Protocol (MCP)?

The Model Context Protocol is an open standard that enables AI models to:
- Connect to external data sources
- Access real-time information
- Interact with databases, APIs, and other services
- Maintain context across conversations
- Extend capabilities beyond their training data

## ThoughtSpot MCP Server

The examples in this directory utilize the [ThoughtSpot MCP Server](https://github.com/thoughtspot/mcp-server), which provides secure OAuth-based authentication and tools for querying and retrieving data from ThoughtSpot instances. The ThoughtSpot MCP Server is a remote server hosted on Cloudflare that enables AI models to interact with ThoughtSpot analytics through the MCP protocol.

## Projects in this Directory

### 1. [Python Google ADK Trusted Auth](./python-google-adk-trusted-auth/)
A Python implementation demonstrating trusted authentication with Google ADK (Agent Developement Kit) using MCP. This example shows how to build and agent which can access ThoughtSpot AI through the MCP framework using Google Agent developement kit.

**Key Features:**
- Google Agent developement kit integration
- Secure credential management with ThoughtSpot trusted auth
- MCP client implementation

### 2. [Simple Python Fast MCP](./simple-python-fast-mcp/)
A lightweight, fast Python MCP implementation that demonstrates core MCP concepts with minimal dependencies. Perfect for learning MCP fundamentals or building simple integrations.

**Key Features:**
- Minimal Python implementation
- Fast performance
- Easy to understand and extend
- Core MCP protocol support

## Related Technologies

- **[ThoughtSpot MCP Server](https://github.com/thoughtspot/mcp-server)** - The MCP server implementation used in these examples
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Official MCP specification and documentation


## Resources

- [ThoughtSpot Developer Discord](https://developers.thoughtspot.com/join-discord)
- [ThoughtSpot MCP Blog](https://www.thoughtspot.com/blog/introducing-agentic-mcp-server)

---

*These examples demonstrate practical implementations of the Model Context Protocol. For production use, please refer to the official MCP documentation and ensure proper security practices.*
