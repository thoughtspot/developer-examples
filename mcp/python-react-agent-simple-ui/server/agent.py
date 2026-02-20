"""
Python Agent with OpenAI Responses API and ThoughtSpot MCP Server.
Exposes a FastAPI server that streams chat responses to the React frontend.
"""

import os
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="ThoughtSpot Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = OpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    base_url=os.getenv("AZURE_OPENAI_ENDPOINT"),
)
TS_HOST = os.getenv("VITE_TS_HOST") or os.getenv("TS_HOST")
TS_AUTH_TOKEN = os.getenv("VITE_TS_AUTH_TOKEN") or os.getenv("TS_AUTH_TOKEN")

if not TS_AUTH_TOKEN or not TS_HOST:
    raise RuntimeError(
        "TS_AUTH_TOKEN and TS_HOST (or their VITE_ prefixed versions) must be set in .env"
    )

# Note the important comments in the SYSTEM_PROMPT.
# To customize the behavior of the MCP agent, add instructions to the SYSTEM_PROMPT.
# Commented example below: Forces the agent to use the (Sample) Retail - Apparel datasource for all questions.
# Can be paired with the allowed_tools parameter in the MCP_TOOL config below to control what the MCP Server will do
SYSTEM_PROMPT = (
    "You are a helpful data analyst assistant powered by ThoughtSpot. "
    "You can help users explore and analyze their data using ThoughtSpot's capabilities. "
    "When answering questions about data, use the available ThoughtSpot tools to search "
    "and retrieve information. Present data clearly and provide insights when possible."
    "The thoughtspots tool responds with a frame_url, which is an iframe url that can be displayed in a web browser. " # important!
    "Send raw html elements in the response, the client can display it in a iframe. Something like this: <iframe src='frame_url'></iframe>" # important!
    "Do not ask to create charts, as thoughtspot will already create interactive charts for you."
    "Respond in an engaging markdown format, with html tags when needed."
    "Keep the response short and to the point."
    # "Use this datasource: cd252e5c-b552-49a8-821d-3eadaa049cca to answer all data questions."
)

# ThoughtSpot Tools:
# To specify exactly which Spotter tools should be accessible to the agent, use the allowed_tools parameter.
# In the MCP_TOOL config below and list the tools that are allowed to be used.
# All tools are allowed by default.
#
# ping: Test connectivity and authentication.
# getRelevantQuestions: Get relevant data questions from ThoughtSpot analytics based on a user query.
# getAnswer: Get the answer to a specific question from ThoughtSpot analytics.
# createLiveboard: Create a liveboard from a list of answers.
# getDataSourceSuggestions: Get datasource suggestions for a given query.
# To specify exactly which Spotter tools should be accessible to the agent, use the allowed_tools parameter.
# In the MCP_TOOL config below and list the tools that are allowed to be used.

MCP_TOOL = {
    "type": "mcp",
    "server_label": "ThoughtSpot",
    "server_description": "Data analysis and visualization tool for searching and exploring business data",
    "server_url": "https://agent.thoughtspot.app/bearer/mcp",
    "require_approval": "never",
    # "allowed_tools": ["ping", "getRelevantQuestions","getAnswer","createLiveboard","getDataSourceSuggestions"],
    "headers": {
        "Authorization": f"Bearer {TS_AUTH_TOKEN}",
        "x-ts-host": TS_HOST,
    },
}


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.post("/api/chat")
async def chat(request: ChatRequest):
    def event_stream():
        try:
            params = {
                "model": "gpt-5-mini",
                "instructions": SYSTEM_PROMPT,
                "tools": [MCP_TOOL],
                "input": request.message,
                "stream": True,
            }
            if request.response_id:
                params["previous_response_id"] = request.response_id

            stream = openai_client.responses.create(**params)

            for event in stream:
                t = event.type
                if t == "response.output_text.delta":
                    yield format_sse({"type": "delta", "text": event.delta})
                elif t == "response.mcp_list_tools.in_progress":
                    yield format_sse(
                        {"type": "status", "message": "Connecting to ThoughtSpot..."}
                    )
                elif t == "response.mcp_call.in_progress":
                    yield format_sse(
                        {"type": "status", "message": "Querying ThoughtSpot..."}
                    )
                elif t == "response.completed":
                    yield format_sse(
                        {"type": "done", "response_id": event.response.id}
                    )
                elif t == "response.failed":
                    yield format_sse(
                        {"type": "error", "message": "Response generation failed"}
                    )
        except Exception as e:
            yield format_sse({"type": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
