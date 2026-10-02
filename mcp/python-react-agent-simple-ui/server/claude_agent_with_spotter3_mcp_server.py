"""
Python agent: Anthropic Claude + the ThoughtSpot MCP server (Spotter 3 toolset).

FastAPI streams chat responses to the React frontend over Server-Sent Events. The agent
itself - token handling, the shared MCP session, the Claude tool loop, server-side polling
of `get_session_updates` - lives in `spotter3_core.py`. This file is the chat endpoint,
with conversation history held in memory for the life of the process.

To customise the agent, edit `SYSTEM_PROMPT`, `ALLOWED_TOOLS` and `MODEL` in `spotter3_core.py`.

MCP server: https://github.com/thoughtspot/mcp-server
"""

import uuid

from pydantic import BaseModel

from spotter3_core import conversations, create_app, run_turn, sse_response

app = create_app()


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


@app.post("/api/chat")
async def chat(request: ChatRequest):
    conv_id = request.response_id or str(uuid.uuid4())
    print(f"[Chat] conv {conv_id}: {request.message}")
    messages = conversations.get(conv_id, []) + [{"role": "user", "content": request.message}]
    return sse_response(lambda queue: run_turn(messages, conv_id, queue.put_nowait))
