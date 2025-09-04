import os
import asyncio
import json
from typing import Any

from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.artifacts.in_memory_artifact_service import (
    InMemoryArtifactService,  # Optional
)
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import (
    MCPToolset,
    StreamableHTTPConnectionParams,
)
from google.genai import types
from rich import print
from .trusted_auth import get_token

load_dotenv()

USERNAME = os.getenv("USERNAME") or "demo2"
TS_AUTH_TOKEN = get_token(USERNAME)
TS_HOST = os.getenv("TS_HOST")

def create_mcp_toolset():
    """Creates MCPToolset synchronously for ADK."""
    if not TS_AUTH_TOKEN or not TS_HOST:
        print("Warning: TS_AUTH_TOKEN or TS_HOST not set. Creating agent without MCP tools.")
        return None
    
    try:
        # Create MCPToolset directly with connection parameters
        toolset = MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://agent.thoughtspot.app/bearer/mcp",
                headers={
                    "Authorization": f"Bearer {TS_AUTH_TOKEN}@{TS_HOST}",
                }
            )
        )
        print("MCP Toolset created successfully.")
        return toolset
    except Exception as e:
        print(f"Warning: Failed to create MCP toolset: {e}")
        return None

def create_root_agent():
    """Creates the root agent synchronously for ADK."""
    try:
        toolset = create_mcp_toolset()
        
        if toolset:
            tools = [toolset]
            instruction = """You are a helpful assistant that can help with ThoughtSpot queries.
            Use the following tools to help with ThoughtSpot queries:
            - toolset
            """
        else:
            tools = []
            instruction = """You are a helpful assistant that can help with ThoughtSpot queries.
            Use the following tools to help with ThoughtSpot queries:
            - toolset
            """
        
        root_agent = LlmAgent(
            model="gemini-2.5-flash",
            name="assistant",
            instruction=instruction,
            tools=tools,
        )
        
        print(f"Root agent created successfully with {len(tools)} tool(s).")
        return root_agent
        
    except Exception as e:
        print(f"Error creating root agent: {e}")
        # Create a minimal fallback agent
        return LlmAgent(
            model="gemini-2.5-flash-lite",
            name="assistant",
            instruction="I'm a fallback agent. Please check the configuration.",
            tools=[],
        )

# Expose the root_agent for ADK
root_agent = create_root_agent()