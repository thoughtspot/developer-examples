"""
OpenAI API Example using Chat Completions
This script demonstrates how to use the OpenAI Python library to make API calls.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def main():
    """
    Main function to demonstrate OpenAI API usage.
    Sends a simple "hello" message to the chat completions API.
    """
    # Initialize the OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables. Please set it in your .env file.")
    
    client = OpenAI(api_key=api_key)
    
    try:
        # Make a call to the chat completions API
        print("Sending message to OpenAI API...")
        resp = client.responses.create(
            model="gpt-5",
            tools=[
                {
                    "type": "mcp",
                    "server_label": "ThoughtSpot",
                    "server_description": "Data analysis and visualization tool",
                    "server_url": "https://agent.thoughtspot.app/bearer/mcp",
                    "require_approval": "never",
                    "headers": {
                        "Authorization": f"Bearer {os.getenv('TS_AUTH_TOKEN')}",
                        "x-ts-host": os.getenv('TS_HOST'),
                    },
                    "allowed_tools": ["ping"],
                },
            ],
            input="Ping ThoughtSpot",
        )

        print(resp.output_text)
        
    except Exception as e:
        print(f"Error making API call: {e}")
        raise

if __name__ == "__main__":
    main()

