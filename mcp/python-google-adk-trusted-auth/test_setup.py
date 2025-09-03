#!/usr/bin/env python3
"""
Test script to verify the ADK agent setup.
Run this before using 'adk run' to check for configuration issues.
"""

import os
from dotenv import load_dotenv

def test_environment():
    """Test if environment variables are set correctly."""
    load_dotenv()
    
    print("=== Environment Check ===")
    ts_auth_token = os.getenv("TS_AUTH_TOKEN")
    ts_host = os.getenv("TS_HOST")
    
    if ts_auth_token:
        print(f"✓ TS_AUTH_TOKEN is set (length: {len(ts_auth_token)})")
    else:
        print("✗ TS_AUTH_TOKEN is not set")
    
    if ts_host:
        print(f"✓ TS_HOST is set: {ts_host}")
    else:
        print("✗ TS_HOST is not set")
    
    if not ts_auth_token or not ts_host:
        print("\nPlease create a .env file with:")
        print("TS_AUTH_TOKEN=your_token_here")
        print("TS_HOST=your_host_here")
        return False
    
    return True

def test_imports():
    """Test if all required packages can be imported."""
    print("\n=== Import Check ===")
    
    try:
        import google.adk
        print("✓ google-adk imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import google-adk: {e}")
        return False
    
    try:
        import google.genai
        print("✓ google-genai imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import google-genai: {e}")
        return False
    
    try:
        import aiohttp
        print("✓ aiohttp imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import aiohttp: {e}")
        return False
    
    return True

def test_agent_creation():
    """Test if the agent can be created."""
    print("\n=== Agent Creation Test ===")
    
    try:
        from adk_mcp_client import create_root_agent
        agent = create_root_agent()
        if agent:
            print("✓ Agent created successfully")
            print(f"  - Name: {agent.name}")
            print(f"  - Model: {agent.model}")
            print(f"  - Tools: {len(agent.tools) if hasattr(agent, 'tools') else 'N/A'}")
            return True
        else:
            print("✗ Agent creation returned None")
            return False
    except Exception as e:
        print(f"✗ Failed to create agent: {e}")
        return False

def main():
    """Run all tests."""
    print("Testing ADK Agent Setup...\n")
    
    env_ok = test_environment()
    imports_ok = test_imports()
    
    if env_ok and imports_ok:
        agent_ok = test_agent_creation()
        if agent_ok:
            print("\n🎉 All tests passed! You should be able to run 'adk run' now.")
        else:
            print("\n❌ Agent creation failed. Check the error messages above.")
    else:
        print("\n❌ Setup incomplete. Please fix the issues above before running 'adk run'.")

if __name__ == "__main__":
    main()
