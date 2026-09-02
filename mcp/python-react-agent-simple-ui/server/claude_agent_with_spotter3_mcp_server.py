"""
Python agent: Anthropic Claude + the ThoughtSpot MCP server (Spotter 3 toolset).

FastAPI streams chat responses to the React frontend over Server-Sent Events.

Why client-side MCP: the ThoughtSpot MCP server's static-token endpoint needs custom
HTTP headers (Authorization + x-ts-host). Anthropic's server-side MCP connector cannot
send those, so this process connects to the MCP server itself and executes tool calls.

Two things this server does that a plain pass-through loop does not:

1. `get_session_updates` polling happens here, not in the model. The ThoughtSpot
   Analytics Agent answers asynchronously, so one `get_session_updates` call usually
   returns `is_done: false` and an empty list. Letting the model poll costs a full
   model round-trip per poll. Instead we poll until `is_done: true` and hand the model
   one consolidated result, streaming the Agent's progress to the UI as it arrives.

2. Answers are rendered by the client, not by the model. Each `answer` update becomes
   an iframe marked `tsmcp=true`, which the React client mounts and the Visual Embed
   SDK's `startAutoMCPFrameRenderer` upgrades into a real ThoughtSpot embed. We keep
   the URL out of what the model sees - it is long, and the model does not need to
   echo markup for a chart the UI has already drawn.

MCP server: https://github.com/thoughtspot/mcp-server
"""

import asyncio
import json
import os
import time
import traceback
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

import anthropic
import httpx2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from mcp import Client, MCPError
from mcp.client.streamable_http import streamable_http_client
from pydantic import BaseModel

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="ThoughtSpot Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Anthropic ───────────────────────────────────────────────────────────────────
claude_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5")
MAX_TOKENS = 16000

# Safety classifiers can decline a request (HTTP 200, stop_reason="refusal"). The
# server-side fallback beta re-routes those to a fallback model automatically.
REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01"

# ── ThoughtSpot MCP server ──────────────────────────────────────────────────────
TS_HOST = os.getenv("VITE_TS_HOST") or os.getenv("TS_HOST")
TS_AUTH_TOKEN = os.getenv("VITE_TS_AUTH_TOKEN") or os.getenv("TS_AUTH_TOKEN")

if not TS_AUTH_TOKEN or not TS_HOST:
    raise RuntimeError(
        "TS_AUTH_TOKEN and TS_HOST (or their VITE_ prefixed versions) must be set in .env"
    )

# The `/token/*` endpoint family is the static-bearer-token transport.
# (`/bearer/*` is the legacy path and is frozen on the older v1 toolset.)
#
# `latest` tracks the newest toolset, so a ThoughtSpot release can change the tools
# and the update shape under this app. Set TS_MCP_API_VERSION to a release date
# (e.g. 2026-05-01) to pin it instead.
MCP_API_VERSION = os.getenv("TS_MCP_API_VERSION", "latest")
#
# Adding `&enable-raw-session-updates=true` makes the server stream the Agent's own
# updates instead of its digested ones. This app reads either - see "Reading session
# updates" below - so you can turn it on through TS_MCP_URL without touching the code.
MCP_URL = os.getenv(
    "TS_MCP_URL",
    f"https://agent.thoughtspot.app/token/mcp?api-version={MCP_API_VERSION}",
)

MCP_HEADERS = {
    "Authorization": f"Bearer {TS_AUTH_TOKEN}",
    "x-ts-host": TS_HOST,
}

# ── Embed token minting ─────────────────────────────────────────────────────────
# The Visual Embed SDK requires a FRESH token from every `getAuthToken` call. Handing
# it the same static token twice trips its duplicate-token check the moment the token
# stops verifying, and the callback can never recover because it returns the same
# string. So the browser asks this server for a token instead, and this server mints a
# short-lived one per request.
#
# Minting needs a username plus either the cluster secret key (Develop > Customizations
# > Security Settings > Trusted authentication) or that user's password. `secret_key`
# takes precedence when both are set.
TS_EMBED_USERNAME = os.getenv("TS_EMBED_USERNAME")
TS_SECRET_KEY = os.getenv("TS_SECRET_KEY")
TS_EMBED_PASSWORD = os.getenv("TS_EMBED_PASSWORD")
TS_TOKEN_VALIDITY_SEC = int(os.getenv("TS_TOKEN_VALIDITY_SEC", "1800"))

CAN_MINT_TOKENS = bool(TS_EMBED_USERNAME and (TS_SECRET_KEY or TS_EMBED_PASSWORD))

if not CAN_MINT_TOKENS:
    print(
        "[Auth] TS_EMBED_USERNAME + TS_SECRET_KEY (or TS_EMBED_PASSWORD) are not set - "
        "/api/ts-token will serve the static TS_AUTH_TOKEN. Fine for a local demo, but "
        "the SDK cannot recover once that token expires."
    )

# Long read timeout: MCP replies stream over SSE and the Analytics Agent is slow.
MCP_TIMEOUT = httpx2.Timeout(30.0, read=300.0)

# ThoughtSpot MCP tools, as exposed by the Spotter 3 toolset:
#
#   check_connectivity        - test connectivity + auth. No inputs.
#   search_objects            - find existing Liveboards / Answers / Worksheets by name.
#                               Metadata only; never returns data.
#   create_analysis_session   - start a session. Optional: data_source_id.
#                               Returns analytical_session_id.
#   send_session_message      - ask the Analytics Agent a question.
#                               Inputs: analytical_session_id, message, additional_context.
#   get_session_updates       - poll for updates. Input: analytical_session_id.
#                               Returns session_updates[] + is_done. See AUTOPOLL below.
#   create_dashboard          - build a dashboard from answer_ids.
#                               Inputs: title, answers[], note_tile. Returns link.
#   list_orgs / switch_org    - OAuth-only. The server hides them on `/token/*`, so they
#                               never appear in the tool list for this static-token setup.
#
# Set ALLOWED_TOOLS to a list of names to restrict the agent. None allows everything
# the server exposes, which is the right default: the tool list is version-negotiated,
# so a hardcoded list silently drops tools added in later API versions.
ALLOWED_TOOLS: list[str] | None = None

# ── Server-side polling of get_session_updates ──────────────────────────────────
POLL_TOOL = "get_session_updates"
POLL_INITIAL_DELAY = 0.75  # seconds before the first re-poll
POLL_MAX_DELAY = 4.0  # cap on the backoff
POLL_TIMEOUT = 300.0  # give up after this long without is_done

SYSTEM_PROMPT = """You are a data analyst assistant powered by ThoughtSpot's Analytics Agent.

Workflow:
- Create one analysis session per conversation with `create_analysis_session`, then ask
  questions with `send_session_message`, then call `get_session_updates` once.
- `get_session_updates` is polled to completion for you: a single call returns the Agent's
  full response, so never call it twice for the same question.
- Use `search_objects` to find existing Liveboards, Answers or Worksheets by name. It
  returns metadata only, never data - to answer a data question, ask the Agent.
- Use `create_dashboard` when the user wants to save or share results, passing the
  `answer_id` values from the answers you want on it.

Presenting answers:
- Every `answer` update is ALREADY rendered in the UI as an interactive ThoughtSpot chart,
  in the order it was returned. Do not emit <iframe> tags, image links, or a markdown table
  that restates the chart.
- Refer to an answer by its title, and add the insight the chart does not show on its own -
  the trend, the outlier, the "so what".

Style: short markdown. Lead with the answer, then at most three bullets. No preamble."""

# Uncomment to force one datasource for every question in this app:
# SYSTEM_PROMPT += (
#     "\nUse this datasource for all data questions: "
#     "cd252e5c-b552-49a8-821d-3eadaa049cca."
# )

# conv_id -> full Claude message history, including tool interactions
conversations: dict[str, list] = {}

# conv_id -> analytical_session_id from create_analysis_session, injected into the
# system prompt on later turns so follow-ups continue in the same ThoughtSpot session.
analytical_sessions: dict[str, str] = {}


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def tool_payload(result: Any) -> dict:
    """Read a tool result as JSON.

    The ThoughtSpot MCP server declares an outputSchema on every Spotter 3 tool, so
    results arrive as `structured_content`. The text content block holds the same JSON,
    which is the fallback for tools without an outputSchema.
    """
    structured = getattr(result, "structured_content", None)
    if isinstance(structured, dict):
        return structured

    text = result_text(result)
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def result_text(result: Any) -> str:
    return " ".join(getattr(c, "text", str(c)) for c in (result.content or []))


# ── Reading session updates ─────────────────────────────────────────────────────
# The default endpoint returns the server's digested updates. Adding
# `enable-raw-session-updates=true` to TS_MCP_URL returns the Agent's own, and the two
# shapes differ:
#
#                     digested                  raw
#   prose chunks      `text_chunk`              `text-chunk`
#   progress          `step_notification`       `notification` (+ metadata.tool_title)
#   thinking marker   `is_thinking: true`       `metadata.type == "thinking"`
#   answer title      `answer_title`            `title`
#   answer URL        `iframe_url`              absent - the ids to build it are in
#                                               metadata instead
#
# The helpers below read either, so the app keeps working if the flag is turned off
# or the shape changes back.

TEXT_CHUNK_TYPES = ("text_chunk", "text-chunk")


def update_metadata(update: dict) -> dict:
    """An update's `metadata`, or an empty dict when it has none or it is not one.

    Only raw updates carry metadata, so every caller has to cope with its absence.
    """
    metadata = update.get("metadata")
    return metadata if isinstance(metadata, dict) else {}


def is_thinking_update(update: dict) -> bool:
    """Whether an update is the Agent reasoning rather than answering."""
    if update.get("is_thinking"):
        return True
    return update_metadata(update).get("type") == "thinking"


def answer_frame_params(update: dict) -> dict | None:
    """The four ids that locate an answer generation, from a raw `answer` update.

    Raw mode does not hand us a rendered `iframe_url`, so the client builds one from
    these. They map onto the embed route's hash params: sessionId / genNo /
    acSessionId / acGenNo.
    """
    metadata = update_metadata(update)
    if not metadata.get("session_id"):
        return None
    return {
        "session_id": metadata.get("session_id"),
        "gen_no": metadata.get("gen_no"),
        "ac_session_id": metadata.get("transaction_id"),
        "ac_gen_no": metadata.get("generation_number"),
    }


def merge_text_chunks(updates: list[dict]) -> list[dict]:
    """Collapse runs of chunked prose updates into a single `text` update.

    The Agent streams prose a chunk at a time. The model does not need the chunking,
    and each chunk costs a JSON envelope in the tool result.
    """
    merged: list[dict] = []
    for update in updates:
        if not isinstance(update, dict):
            merged.append(update)
            continue
        if update.get("type") in TEXT_CHUNK_TYPES and merged:
            previous = merged[-1]
            if (
                isinstance(previous, dict)
                and previous.get("type") in ("text", *TEXT_CHUNK_TYPES)
                and is_thinking_update(previous) == is_thinking_update(update)
            ):
                previous["type"] = "text"
                previous["text"] = (previous.get("text") or "") + (update.get("text") or "")
                continue
            update = {**update, "type": "text"}
        merged.append(dict(update) if isinstance(update, dict) else update)
    return merged


async def emit_update_events(updates: list[dict], queue: asyncio.Queue) -> None:
    """Stream Analytics Agent progress to the browser while we poll."""
    for update in updates:
        if not isinstance(update, dict):
            continue
        kind = update.get("type")
        if kind == "answer":
            # The Agent emits an `answer` for each intermediate query it tries while
            # reasoning. Only the settled one is a real answer, so the rest would
            # just be noise in the transcript.
            if is_thinking_update(update):
                continue
            metadata = update_metadata(update)
            queue.put_nowait(
                {
                    "type": "answer",
                    "answer_id": update.get("answer_id"),
                    "title": update.get("answer_title") or update.get("title"),
                    "query": update.get("answer_query") or metadata.get("sage_query"),
                    # Present in digested mode; in raw mode the client builds the URL
                    # from `frame_params` instead.
                    "iframe_url": update.get("iframe_url"),
                    "frame_params": answer_frame_params(update),
                }
            )
        elif kind in ("step_notification", "notification") or is_thinking_update(update):
            metadata = update_metadata(update)
            text = (
                update.get("text") or metadata.get("tool_title") or metadata.get("title") or ""
            ).strip()
            if text:
                queue.put_nowait({"type": "status", "message": text})


def strip_rendered_answers(updates: list[dict]) -> list[dict]:
    """Drop `iframe_url` from what the model sees - the UI already rendered the chart."""
    cleaned = []
    for update in updates:
        if isinstance(update, dict) and update.get("type") == "answer":
            update = {k: v for k, v in update.items() if k != "iframe_url"}
            update["rendered_in_ui"] = True
        cleaned.append(update)
    return cleaned


async def call_tool(
    mcp: Client, name: str, arguments: dict, queue: asyncio.Queue
) -> tuple[str, bool]:
    """Execute one MCP tool call. Returns (result text for the model, is_error)."""
    try:
        result = await mcp.call_tool(name, arguments)
    except MCPError as exc:
        print(f"[MCP] Tool {name} failed: {exc}")
        return f"Tool call failed: {exc}", True

    is_error = bool(getattr(result, "is_error", False))
    if is_error or name != POLL_TOOL:
        return result_text(result), is_error

    return await autopoll_session_updates(mcp, arguments, result, queue)


async def autopoll_session_updates(
    mcp: Client, arguments: dict, first_result: Any, queue: asyncio.Queue
) -> tuple[str, bool]:
    """Keep polling `get_session_updates` until the Agent is done.

    Each poll returns only updates not yet delivered, so we accumulate them and hand
    the model one consolidated result instead of spending a model turn per poll.
    """
    payload = tool_payload(first_result)
    updates: list[dict] = list(payload.get("session_updates") or [])
    is_done = bool(payload.get("is_done"))
    await emit_update_events(updates, queue)

    deadline = time.monotonic() + POLL_TIMEOUT
    delay = POLL_INITIAL_DELAY

    while not is_done:
        if time.monotonic() > deadline:
            print(f"[MCP] {POLL_TOOL} timed out after {POLL_TIMEOUT}s")
            break

        await asyncio.sleep(delay)
        try:
            result = await mcp.call_tool(POLL_TOOL, arguments)
        except MCPError as exc:
            print(f"[MCP] {POLL_TOOL} poll failed: {exc}")
            return f"Polling for session updates failed: {exc}", True

        if getattr(result, "is_error", False):
            return result_text(result), True

        payload = tool_payload(result)
        new_updates = list(payload.get("session_updates") or [])
        is_done = bool(payload.get("is_done"))
        updates.extend(new_updates)
        await emit_update_events(new_updates, queue)

        # Reset the backoff whenever the Agent is actually producing output.
        delay = POLL_INITIAL_DELAY if new_updates else min(delay * 1.5, POLL_MAX_DELAY)

    consolidated = {
        "session_updates": strip_rendered_answers(merge_text_chunks(updates)),
        "is_done": is_done,
    }
    if not is_done:
        consolidated["note"] = (
            "The Analytics Agent did not finish within the polling timeout. "
            "Summarize what arrived and offer to retry."
        )
    return json.dumps(consolidated), False


def build_tools(mcp_tools: list) -> list[dict]:
    """Convert MCP tool definitions to Anthropic tool definitions."""
    if ALLOWED_TOOLS is not None:
        mcp_tools = [t for t in mcp_tools if t.name in ALLOWED_TOOLS]

    tools = [
        {
            "name": t.name,
            "description": t.description or "",
            "input_schema": t.input_schema,
        }
        for t in mcp_tools
    ]
    # Cache the tool definitions - they are identical on every turn of every
    # conversation, and they sit at the front of the cacheable prefix.
    if tools:
        tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


def build_system(conv_id: str) -> list[dict]:
    blocks = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]
    session_id = analytical_sessions.get(conv_id)
    if session_id:
        blocks.append(
            {
                "type": "text",
                "text": (
                    f"Active ThoughtSpot analytical session ID: {session_id}. "
                    "Reuse it for send_session_message and get_session_updates so "
                    "follow-up questions stay in the same session."
                ),
            }
        )
    return blocks


async def agent_loop(messages: list, queue: asyncio.Queue, conv_id: str) -> None:
    """Client-side agentic loop against the ThoughtSpot MCP server."""
    try:
        print(f"[MCP] Connecting to {MCP_URL}")
        async with httpx2.AsyncClient(
            headers=MCP_HEADERS, timeout=MCP_TIMEOUT, follow_redirects=True
        ) as http_client:
            transport = streamable_http_client(MCP_URL, http_client=http_client)
            async with Client(transport) as mcp:
                listing = await mcp.list_tools()
                print(f"[MCP] {len(listing.tools)} tools: {[t.name for t in listing.tools]}")

                tools = build_tools(listing.tools)
                system = build_system(conv_id)
                current_messages = messages[:]

                while True:
                    async with claude_client.beta.messages.stream(
                        model=MODEL,
                        max_tokens=MAX_TOKENS,
                        system=system,
                        messages=current_messages,
                        tools=tools,
                        thinking={"type": "adaptive", "display": "summarized"},
                        betas=[REFUSAL_FALLBACK_BETA],
                        fallbacks="default",
                    ) as stream:
                        async for event in stream:
                            kind = getattr(event, "type", None)
                            if kind == "content_block_start":
                                block_type = getattr(event.content_block, "type", None)
                                if block_type == "tool_use":
                                    queue.put_nowait(
                                        {
                                            "type": "status",
                                            "message": tool_status(event.content_block.name),
                                        }
                                    )
                                elif block_type == "thinking":
                                    queue.put_nowait(
                                        {"type": "status", "message": "Thinking..."}
                                    )
                            elif kind == "content_block_delta":
                                delta = event.delta
                                if getattr(delta, "type", None) == "text_delta":
                                    queue.put_nowait({"type": "delta", "text": delta.text})

                        final_message = await stream.get_final_message()

                    if final_message.stop_reason == "refusal":
                        details = getattr(final_message, "stop_details", None)
                        queue.put_nowait(
                            {
                                "type": "error",
                                "message": "The request was declined"
                                + (f" ({details.category})" if details else "")
                                + ". Try rephrasing it.",
                            }
                        )
                        return

                    if final_message.stop_reason != "tool_use":
                        break

                    # Run the turn's tool calls concurrently, then return every result
                    # in a single user message - splitting them teaches the model to
                    # stop making parallel calls.
                    tool_uses: list[Any] = [
                        b for b in final_message.content if getattr(b, "type", None) == "tool_use"
                    ]
                    results = await asyncio.gather(
                        *(call_tool(mcp, b.name, b.input, queue) for b in tool_uses)
                    )

                    tool_results = []
                    for block, (text, is_error) in zip(tool_uses, results):
                        print(f"[MCP] {block.name}({block.input}) -> {text[:400]}")
                        remember_session(conv_id, block.name, text)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": text,
                                "is_error": is_error,
                            }
                        )

                    current_messages = current_messages + [
                        {"role": "assistant", "content": final_message.content},
                        {"role": "user", "content": tool_results},
                    ]

                # Persist the whole history, tool interactions included, so follow-up
                # turns keep the context that produced the answer.
                conversations[conv_id] = current_messages + [
                    {"role": "assistant", "content": final_message.content}
                ]
                queue.put_nowait({"type": "done", "response_id": conv_id})

    except anthropic.APIStatusError as exc:
        traceback.print_exc()
        queue.put_nowait({"type": "error", "message": f"Claude API error {exc.status_code}"})
    except BaseException as exc:  # noqa: BLE001 - surface anything to the UI
        traceback.print_exc()
        # anyio wraps transport failures in ExceptionGroups; unwrap to the root cause.
        err = exc
        while getattr(err, "exceptions", None):
            err = err.exceptions[0]
        queue.put_nowait({"type": "error", "message": f"{type(err).__name__}: {err}"})


def tool_status(name: str) -> str:
    return {
        "check_connectivity": "Checking the ThoughtSpot connection...",
        "search_objects": "Searching ThoughtSpot...",
        "create_analysis_session": "Starting an analysis session...",
        "send_session_message": "Asking the Analytics Agent...",
        POLL_TOOL: "Waiting for the Analytics Agent...",
        "create_dashboard": "Building the dashboard...",
    }.get(name, "Querying ThoughtSpot...")


def remember_session(conv_id: str, tool_name: str, text: str) -> None:
    """Capture the analytical_session_id so later turns reuse the same session."""
    if tool_name != "create_analysis_session" or analytical_sessions.get(conv_id):
        return
    try:
        session_id = json.loads(text).get("analytical_session_id")
    except (ValueError, TypeError, AttributeError):
        return
    if session_id:
        analytical_sessions[conv_id] = session_id
        print(f"[MCP] conv {conv_id} -> analytical session {session_id}")


@app.post("/api/chat")
async def chat(request: ChatRequest):
    conv_id = request.response_id or str(uuid.uuid4())
    print(f"[Chat] conv {conv_id}: {request.message}")
    history = conversations.get(conv_id, [])
    messages = history + [{"role": "user", "content": request.message}]

    queue: asyncio.Queue = asyncio.Queue()
    task = asyncio.create_task(agent_loop(messages, queue, conv_id))

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            while True:
                item = await queue.get()
                yield format_sse(item)
                if item.get("type") in ("done", "error"):
                    break
        finally:
            # The browser hung up (or we finished) - don't leave the loop running.
            if not task.done():
                task.cancel()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/ts-token")
async def ts_token():
    """Mint a short-lived ThoughtSpot token for the Visual Embed SDK.

    Called on every `getAuthToken`, so each call must return a NEW token - that is
    exactly what the SDK's duplicate-token check enforces.
    """
    if not CAN_MINT_TOKENS:
        # No minting credentials configured - fall back to the static token so the
        # demo still runs. See the CAN_MINT_TOKENS note above for the caveat.
        return {"token": TS_AUTH_TOKEN, "minted": False}

    payload: dict[str, Any] = {
        "username": TS_EMBED_USERNAME,
        "validity_time_in_sec": TS_TOKEN_VALIDITY_SEC,
    }
    # secret_key wins over password when both are present, per the REST API contract.
    if TS_SECRET_KEY:
        payload["secret_key"] = TS_SECRET_KEY
    else:
        payload["password"] = TS_EMBED_PASSWORD

    # This endpoint is occasionally slow to respond, and a bare timeout here would
    # surface to the browser as an unhandled 500 with no explanation.
    try:
        async with httpx2.AsyncClient(timeout=httpx2.Timeout(10.0, read=60.0)) as client:
            response = await client.post(
                f"{TS_HOST.rstrip('/')}/api/rest/2.0/auth/token/full", json=payload
            )
    except httpx2.HTTPError as exc:
        print(f"[Auth] Token mint request failed: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=504, detail=f"ThoughtSpot token request failed: {type(exc).__name__}"
        ) from exc

    if response.status_code != 200:
        # Surface the cluster's own reason (bad secret key, trusted auth disabled, ...)
        # rather than a blank 500 the browser cannot explain.
        print(f"[Auth] Token mint failed {response.status_code}: {response.text[:300]}")
        raise HTTPException(
            status_code=502,
            detail=f"ThoughtSpot token request failed ({response.status_code})",
        )

    return {"token": response.json()["token"], "minted": True}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/tools")
async def list_mcp_tools():
    """Debug helper: what the MCP server exposes for this token and API version."""
    async with (
        httpx2.AsyncClient(
            headers=MCP_HEADERS, timeout=MCP_TIMEOUT, follow_redirects=True
        ) as http_client,
        Client(streamable_http_client(MCP_URL, http_client=http_client)) as mcp,
    ):
        listing = await mcp.list_tools()
    return {
        "url": MCP_URL,
        "tools": [{"name": t.name, "description": t.description} for t in listing.tools],
    }
