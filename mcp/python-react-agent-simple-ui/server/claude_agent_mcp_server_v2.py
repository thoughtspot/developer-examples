"""
Python Agent with Anthropic Claude API and ThoughtSpot MCP Server V2.
Exposes a FastAPI server that streams chat responses to the React frontend.

Uses client-side MCP tool calling so we can pass custom HTTP headers
(Authorization + x-ts-host) required by the ThoughtSpot MCP proxy.
Anthropic's server-side MCP client beta does not support custom headers,
so we connect to the MCP server directly from this FastAPI process instead.
"""

import os
import json
import uuid
import asyncio
import traceback
from typing import AsyncGenerator

import anthropic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
from mcp import ClientSession, McpError
from mcp.client.streamable_http import streamablehttp_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="ThoughtSpot Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

claude_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

TS_HOST = os.getenv("VITE_TS_HOST") or os.getenv("TS_HOST")
TS_AUTH_TOKEN = os.getenv("VITE_TS_AUTH_TOKEN") or os.getenv("TS_AUTH_TOKEN")

if not TS_AUTH_TOKEN or not TS_HOST:
    raise RuntimeError(
        "TS_AUTH_TOKEN and TS_HOST (or their VITE_ prefixed versions) must be set in .env"
    )

MCP_URL = "https://agent.thoughtspot.app/token/mcp?api-version=beta"

MCP_HEADERS = {
    "Authorization": f"Bearer {TS_AUTH_TOKEN}",
    "x-ts-host": TS_HOST,
}

# Note the important comments in the SYSTEM_PROMPT.
# To customize the behavior of the MCP agent, add instructions to the SYSTEM_PROMPT.
# Commented example below: Forces the agent to use the (Sample) Retail - Apparel datasource for all questions.
# Can be paired with ALLOWED_TOOLS below to control what the MCP Server will do.
SYSTEM_PROMPT = (
    "You are a helpful data analyst assistant powered by ThoughtSpot. "
    "You can help users explore and analyze their data using ThoughtSpot's capabilities. "
    "When answering questions about data, use the available ThoughtSpot tools to search "
    "and retrieve information. Present data clearly and provide insights when possible."
    "The thoughtspots tool responds with a iframe_url, which is an iframe url that can be displayed in a web browser. " # important!
    "Send raw html elements in the response, the client can display it in a iframe. Something like this: <iframe src='frame_url'></iframe>" # important!
    "Do not ask to create charts, as thoughtspot will already create interactive charts for you."
    "Respond in an engaging markdown format, with html tags when needed."
    "Keep the response short and to the point."
    # "Use this datasource: cd252e5c-b552-49a8-821d-3eadaa049cca to answer all data questions."
)

# ThoughtSpot MCP Tools (v2):
# To restrict which tools are accessible to the agent, set ALLOWED_TOOLS to a list of tool names.
# Set to None to allow all tools.
#
# The v2 MCP server uses an analytical session workflow:
#   1. check_connectivity        - Test connectivity and authentication. No inputs.
#   2. create_analysis_session   - Start a session. Optional: data_source_id.
#                                  Returns: analytical_session_id.
#   3. send_session_message      - Send a natural-language question to the session.
#                                  Inputs: analytical_session_id, message, additional_context (optional).
#   4. get_session_updates       - Poll for incremental updates. Inputs: analytical_session_id.
#                                  Returns: session_updates (list), is_done (bool).
#                                  Poll until is_done=True. Each update has type: text | text_chunk | answer.
#                                  Answer updates include: answer_id, answer_title, answer_query, iframe_url.
#   5. create_dashboard          - Create a dashboard from answer IDs.
#                                  Inputs: title, answers (list of answer_ids), note_tile.
#                                  Returns: link.
ALLOWED_TOOLS = None
# ALLOWED_TOOLS = ["check_connectivity", "create_analysis_session", "send_session_message", "get_session_updates", "create_dashboard"]

# In-memory conversation store: conv_id -> full message history (including tool interactions)
conversations: dict[str, list] = {}

# 1:1 mapping: conv_id -> analytical_session_id returned by create_analysis_session tool.
# Passed to Claude via system prompt so follow-up send_session_message / get_session_updates
# calls use the same ThoughtSpot analytical session.
analytical_sessions: dict[str, str] = {}


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def agent_loop(messages: list, queue: asyncio.Queue, conv_id: str) -> None:
    """
    Client-side agentic loop. Connects to the ThoughtSpot MCP server directly
    (with Authorization + x-ts-host headers), fetches tool definitions, then
    runs the Claude tool-use loop until the model stops calling tools.
    Puts SSE event dicts into queue for streaming to the frontend.
    """
    try:
        headers = dict(MCP_HEADERS)

        print(f"[MCP] Connecting to {MCP_URL}")
        async with streamablehttp_client(MCP_URL, headers=headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                print("[MCP] Initializing session...")
                await session.initialize()
                print("[MCP] Session initialized. Fetching tools...")

                # Fetch tool definitions from ThoughtSpot MCP server
                tools_result = await session.list_tools()
                print(f"[MCP] Got {len(tools_result.tools)} tools")
                available_tools = tools_result.tools
                # Optionally filter tools based on ALLOWED_TOOLS
                if ALLOWED_TOOLS is not None:
                    available_tools = [t for t in available_tools if t.name in ALLOWED_TOOLS]

                # Convert MCP tool definitions to Anthropic format
                anthropic_tools = [
                    {
                        "name": t.name,
                        "description": t.description or "",
                        "input_schema": t.inputSchema,
                    }
                    for t in available_tools
                ]

                current_messages = messages[:]
                final_text_parts: list[str] = []

                # Build system prompt, injecting analytical_session_id for follow-up turns
                system = SYSTEM_PROMPT
                existing_session_id = analytical_sessions.get(conv_id)
                if existing_session_id:
                    system += (
                        f"\n\nActive ThoughtSpot analytical session ID: {existing_session_id}. "
                        "Use this ID when calling send_session_message or get_session_updates "
                        "so follow-up questions continue in the same session."
                    )

                while True:
                    async with claude_client.messages.stream(
                        model="claude-opus-4-6",
                        max_tokens=16000,
                        system=system,
                        messages=current_messages,
                        tools=anthropic_tools,
                    ) as stream:
                        async for event in stream:
                            t = getattr(event, "type", None)
                            if t == "content_block_start":
                                if getattr(event.content_block, "type", None) == "tool_use":
                                    await queue.put({"type": "status", "message": "Querying ThoughtSpot..."})
                            elif t == "content_block_delta":
                                delta = event.delta
                                if getattr(delta, "type", None) == "text_delta":
                                    await queue.put({"type": "delta", "text": delta.text})
                                    final_text_parts.append(delta.text)

                        final_message = await stream.get_final_message()

                    if final_message.stop_reason != "tool_use":
                        break

                    # Execute each tool call via MCP client (headers are set on the session)
                    tool_results = []
                    for block in final_message.content:
                        if getattr(block, "type", None) == "tool_use":
                            try:
                                mcp_result = await session.call_tool(block.name, block.input)
                                print(f"[MCP] Tool {block.name} and input {block.input} returned: {mcp_result}")
                                result_text = " ".join(
                                    getattr(c, "text", str(c)) for c in mcp_result.content
                                ) if mcp_result.content else ""
                                is_error = getattr(mcp_result, "isError", False)

                                # Store analytical_session_id (1:1 with conv_id) so follow-up
                                # requests can reference the same ThoughtSpot session.
                                if block.name == "create_analysis_session" and not analytical_sessions.get(conv_id):
                                    try:
                                        sid = json.loads(result_text).get("analytical_session_id")
                                        if sid:
                                            analytical_sessions[conv_id] = sid
                                            print(f"[MCP] Stored analytical_session_id for conv {conv_id}: {sid}")
                                    except Exception:
                                        pass

                            except McpError as e:
                                print(f"[MCP] Tool {block.name} failed: {e}")
                                result_text = f"Tool call failed: {e}"
                                is_error = True
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result_text,
                                "is_error": is_error,
                            })

                    # Append assistant turn + tool results and continue the loop
                    current_messages = current_messages + [
                        {"role": "assistant", "content": final_message.content},
                        {"role": "user", "content": tool_results},
                    ]
                    final_text_parts = []  # reset; next iteration may stream more text

                # Persist full conversation history (including tool interactions) so
                # follow-up turns have complete context (e.g. analytical_session_id in prior results).
                conversations[conv_id] = current_messages + [
                    {"role": "assistant", "content": final_message.content}
                ]
                await queue.put({"type": "done", "response_id": conv_id})

    except BaseException as e:
        traceback.print_exc()
        # Recursively unwrap ExceptionGroup to get the root cause
        err = e
        while hasattr(err, "exceptions") and getattr(err, "exceptions", None):
            err = err.exceptions[0]
        await queue.put({"type": "error", "message": f"{type(err).__name__}: {err}"})


@app.post("/api/chat")
async def chat(request: ChatRequest):
    conv_id = request.response_id or str(uuid.uuid4())
    print(f"[Chat] Received message for conv_id {conv_id}: {request.response_id}")
    history = conversations.get(conv_id, [])
    messages = history + [{"role": "user", "content": request.message}]

    queue: asyncio.Queue = asyncio.Queue()
    asyncio.create_task(agent_loop(messages, queue, conv_id))

    async def event_stream() -> AsyncGenerator[str, None]:
        while True:
            item = await queue.get()
            yield format_sse(item)
            if item.get("type") in ("done", "error"):
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
