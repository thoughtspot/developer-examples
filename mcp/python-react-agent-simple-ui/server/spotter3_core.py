"""
Shared core of the Claude + ThoughtSpot MCP server (Spotter 3 toolset) examples.

Both `claude_agent_with_spotter3_mcp_server.py` and
`claude_agent_with_spotter3_mcp_server_and_chat_history.py` build on this module: token
handling, the shared MCP session, the Claude tool loop and the SSE plumbing.

Why client-side MCP: the ThoughtSpot MCP server's static-token endpoint needs custom
HTTP headers (Authorization + x-ts-host), which Anthropic's server-side MCP connector
cannot send. So this process connects to the MCP server itself and runs the tool calls.

Two things it does that a plain pass-through loop does not:

1. It polls `get_session_updates` itself. The Analytics Agent answers asynchronously, so
   one call usually returns `is_done: false`. Letting the model poll costs a model
   round-trip per poll; here we poll until done and hand the model one consolidated
   result, streaming the Agent's progress to the UI as it arrives.

2. The client renders answers, not the model. Each `answer` update becomes an `answer`
   event; the React client mounts an iframe for it, which the Visual Embed SDK's
   `startAutoMCPFrameRenderer` upgrades into a real ThoughtSpot embed. The URL stays out
   of what the model sees.

MCP server: https://github.com/thoughtspot/mcp-server
"""

import asyncio
import json
import os
import time
import traceback
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from typing import Any

import anthropic
import httpx2
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from mcp import Client, MCPError
from mcp.client.streamable_http import streamable_http_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

Send = Callable[[dict], None]  # pushes one SSE event to the browser

# ── Claude ──────────────────────────────────────────────────────────────────────
claude_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Haiku 4.5: the agent only picks tools, passes the question on and summarises - the
# Analytics Agent does the analysis. Measured on one question: ~4s of model time on
# Haiku, ~17s on Sonnet 5, ~8s on Opus 5. Set ANTHROPIC_MODEL=claude-sonnet-5 for
# stronger reasoning on multi-step follow-ups.
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
MAX_TOKENS = 16000

# Safety classifiers can decline a request (HTTP 200, stop_reason="refusal"). The
# server-side fallback beta re-routes it to another model, but only models with published
# fallback targets accept it. Sonnet 5 and Haiku 4.5 have none, so a refusal is reported.
REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_CAPABLE_MODELS = ("claude-opus-5", "claude-fable-5-1")


def model_request_options(model: str) -> dict:
    """The thinking and fallback options this model accepts."""
    options: dict[str, Any] = {}
    # Haiku 4.5 predates adaptive thinking, and picking tools does not need it.
    if not model.startswith("claude-haiku"):
        options["thinking"] = {"type": "adaptive", "display": "summarized"}
    if model in FALLBACK_CAPABLE_MODELS:
        options["betas"] = [REFUSAL_FALLBACK_BETA]
        options["fallbacks"] = "default"
    return options


# ── ThoughtSpot MCP server ──────────────────────────────────────────────────────
TS_HOST = os.getenv("VITE_TS_HOST") or os.getenv("TS_HOST")
TS_AUTH_TOKEN = os.getenv("VITE_TS_AUTH_TOKEN") or os.getenv("TS_AUTH_TOKEN")

if not TS_HOST:
    raise RuntimeError("TS_HOST (or VITE_TS_HOST) must be set in .env")

# `/token/*` is the static-bearer-token transport (`/bearer/*` is legacy and frozen on the
# older v1 toolset). `latest` tracks the newest toolset, so a ThoughtSpot release can change
# the tools and the update shape under this app - set TS_MCP_API_VERSION to a release date
# (e.g. 2026-05-01) to pin it. Append `&enable-raw-session-updates=true` to TS_MCP_URL to
# stream the Agent's own updates; both shapes are read (see "Session updates").
MCP_API_VERSION = os.getenv("TS_MCP_API_VERSION", "latest")
MCP_URL = os.getenv(
    "TS_MCP_URL",
    f"https://agent.thoughtspot.app/token/mcp?api-version={MCP_API_VERSION}",
)

# ── ThoughtSpot tokens ──────────────────────────────────────────────────────────
# Two consumers, two policies:
#
#   The browser. The Visual Embed SDK needs a FRESH token on every `getAuthToken` call,
#   so `/api/ts-token` mints one per request.
#
#   This server, for its own MCP and REST calls. A static TS_AUTH_TOKEN eventually
#   expires, and then every tool call fails ("Failed to validate connection") while the
#   tool *list* still works. So we mint a token and cache it until shortly before it
#   expires. TS_AUTH_TOKEN is only the fallback when no minting credentials are set.
#
# Minting needs TS_EMBED_USERNAME plus the cluster secret key (Develop > Customizations >
# Security Settings > Trusted authentication) or that user's password. The secret key wins
# when both are set.
TS_EMBED_USERNAME = os.getenv("TS_EMBED_USERNAME")
TS_SECRET_KEY = os.getenv("TS_SECRET_KEY")
TS_EMBED_PASSWORD = os.getenv("TS_EMBED_PASSWORD")
TS_TOKEN_VALIDITY_SEC = int(os.getenv("TS_TOKEN_VALIDITY_SEC", "1800"))
# The server's own token lives longer: it is never handed out, and fewer mints are
# easier on a slow cluster.
SERVER_TOKEN_VALIDITY_SEC = int(os.getenv("TS_SERVER_TOKEN_VALIDITY_SEC", "3600"))

CAN_MINT_TOKENS = bool(TS_EMBED_USERNAME and (TS_SECRET_KEY or TS_EMBED_PASSWORD))

if not CAN_MINT_TOKENS and not TS_AUTH_TOKEN:
    raise RuntimeError(
        "Set TS_EMBED_USERNAME plus TS_SECRET_KEY (or TS_EMBED_PASSWORD) so the server can "
        "mint ThoughtSpot tokens, or a static TS_AUTH_TOKEN (or VITE_TS_AUTH_TOKEN) in .env"
    )

if not CAN_MINT_TOKENS:
    print(
        "[Auth] TS_EMBED_USERNAME + TS_SECRET_KEY (or TS_EMBED_PASSWORD) are not set - "
        "/api/ts-token will serve the static TS_AUTH_TOKEN. Fine for a local demo, but "
        "the SDK cannot recover once that token expires."
    )

# A cached token is treated as expired this long before it really is, so a call already
# in flight does not race the expiry.
TOKEN_REFRESH_MARGIN_SEC = 120
# The background task renews this long before expiry (capped at half the token's life), so
# no request waits on a mint - which can take 40s on a loaded cluster.
TOKEN_BACKGROUND_LEAD_SEC = 720
TOKEN_BACKGROUND_RETRY_SEC = 30.0  # after a failed background mint; the old token keeps serving
# The loop re-reads the wall clock this often: asyncio.sleep pauses with a sleeping laptop.
TOKEN_BACKGROUND_TICK_SEC = 60.0

_server_token: str | None = None
# Wall-clock (time.time()) instants - not time.monotonic(), which stops while macOS sleeps
# and would keep serving a token the cluster has already expired.
_server_token_expiry = 0.0  # stop serving the token
_server_token_refresh_at = 0.0  # background task renews
# One mint at a time: an agent turn fires several tool calls at once, and on a cold cache
# they would each mint a token.
_server_token_lock = asyncio.Lock()


class TokenMintError(Exception):
    """The cluster would not issue a token."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


async def mint_token(validity_sec: int) -> dict:
    """Ask ThoughtSpot for a bearer token. Returns the parsed response body."""
    payload: dict[str, Any] = {"username": TS_EMBED_USERNAME, "validity_time_in_sec": validity_sec}
    if TS_SECRET_KEY:
        payload["secret_key"] = TS_SECRET_KEY
    else:
        payload["password"] = TS_EMBED_PASSWORD

    # The endpoint is slow at times (15s is normal on a loaded cluster); catch the
    # timeout so the browser gets an explanation instead of a bare 500.
    try:
        async with httpx2.AsyncClient(timeout=httpx2.Timeout(10.0, read=90.0)) as client:
            response = await client.post(
                f"{TS_HOST.rstrip('/')}/api/rest/2.0/auth/token/full", json=payload
            )
    except httpx2.HTTPError as exc:
        raise TokenMintError(type(exc).__name__, 504) from exc

    if response.status_code != 200:
        # The cluster's own reason (bad secret key, trusted auth disabled, ...).
        print(f"[Auth] Token mint failed {response.status_code}: {response.text[:300]}")
        raise TokenMintError(f"HTTP {response.status_code}", 502)

    return response.json()


def server_token_valid() -> bool:
    return bool(_server_token) and time.time() < _server_token_expiry


async def mint_server_token() -> str:
    """Mint a server token and cache it. The caller holds `_server_token_lock`."""
    global _server_token, _server_token_expiry, _server_token_refresh_at

    body = await mint_token(SERVER_TOKEN_VALIDITY_SEC)
    created = body.get("creation_time_in_millis")
    expires = body.get("expiration_time_in_millis")
    lifetime = (
        (expires - created) / 1000
        if isinstance(created, (int, float)) and isinstance(expires, (int, float))
        else SERVER_TOKEN_VALIDITY_SEC
    )
    now = time.time()
    _server_token = body["token"]
    _server_token_expiry = now + max(60.0, lifetime - TOKEN_REFRESH_MARGIN_SEC)
    _server_token_refresh_at = now + max(lifetime / 2, lifetime - TOKEN_BACKGROUND_LEAD_SEC)
    print(f"[Auth] Minted a server token, good for {lifetime:.0f}s", flush=True)
    return _server_token


async def server_token() -> str:
    """A currently-valid bearer token for this server's own ThoughtSpot calls."""
    if not CAN_MINT_TOKENS:
        return TS_AUTH_TOKEN

    # Fast path outside the lock: a valid token never waits on a mint in progress.
    if server_token_valid():
        return _server_token

    async with _server_token_lock:
        if server_token_valid():
            return _server_token
        try:
            return await mint_server_token()
        except TokenMintError as exc:
            # An expiring token beats no token, and the next call retries the mint.
            fallback = _server_token or TS_AUTH_TOKEN
            if not fallback:
                raise
            print(f"[Auth] Could not mint a server token ({exc}); using the previous one.")
            return fallback


async def keep_server_token_fresh() -> None:
    """Background task: mint at startup, then renew ahead of expiry."""
    while True:
        due = _server_token_refresh_at if server_token_valid() else 0.0
        remaining = due - time.time()
        if remaining > 0:
            await asyncio.sleep(min(TOKEN_BACKGROUND_TICK_SEC, remaining))
            continue
        try:
            async with _server_token_lock:
                # A request may have minted while this task waited for the lock.
                if server_token_valid() and time.time() < _server_token_refresh_at:
                    continue
                await mint_server_token()
        except TokenMintError as exc:
            print(f"[Auth] Background token renewal failed ({exc}); retrying soon.")
            await asyncio.sleep(TOKEN_BACKGROUND_RETRY_SEC)
        except Exception:  # noqa: BLE001 - the loop must outlive any one failure
            traceback.print_exc()
            await asyncio.sleep(TOKEN_BACKGROUND_RETRY_SEC)


def invalidate_server_token() -> None:
    """Force the next server_token() call to mint, keeping the old token as a fallback."""
    global _server_token_expiry, _server_token_refresh_at
    _server_token_expiry = 0.0
    _server_token_refresh_at = 0.0


# ── MCP connection ──────────────────────────────────────────────────────────────
# Long read timeout: MCP replies stream over SSE and the Analytics Agent is slow.
MCP_TIMEOUT = httpx2.Timeout(30.0, read=300.0)

# The MCP server's `initialize` intermittently fails with a bare HTTP 500 ("MCPError:
# Server returned an error response") that a second attempt gets past. So a failed
# handshake is retried once, with a fresh token to rule the token out. Only the handshake
# is retried: past it, the turn has streamed output to the browser and cannot be replayed.
MCP_CONNECT_ATTEMPTS = 2
MCP_CONNECT_RETRY_DELAY_SEC = 2.0


def status(message: str) -> dict:
    return {"type": "status", "message": message}


def root_cause(exc: BaseException) -> BaseException:
    """anyio wraps transport failures in ExceptionGroups; unwrap to the first leaf."""
    while getattr(exc, "exceptions", None):
        exc = exc.exceptions[0]
    return exc


@asynccontextmanager
async def connect_mcp(send: Send | None = None) -> AsyncIterator[tuple[Client, Any, str]]:
    """An initialised MCP session, its tool listing and the bearer token it runs on."""
    for attempt in range(1, MCP_CONNECT_ATTEMPTS + 1):
        stack = AsyncExitStack()
        try:
            token = await server_token()
            headers = {"Authorization": f"Bearer {token}", "x-ts-host": TS_HOST}
            http_client = await stack.enter_async_context(
                httpx2.AsyncClient(headers=headers, timeout=MCP_TIMEOUT, follow_redirects=True)
            )
            mcp = await stack.enter_async_context(
                Client(streamable_http_client(MCP_URL, http_client=http_client))
            )
            listing = await mcp.list_tools()
        except BaseException as exc:
            await stack.aclose()
            if not isinstance(exc, Exception) or attempt == MCP_CONNECT_ATTEMPTS:
                raise
            err = root_cause(exc)
            print(
                f"[MCP] Handshake attempt {attempt} failed ({type(err).__name__}: {err}); "
                "retrying with a fresh token"
            )
            if send:
                send(status("Reconnecting to ThoughtSpot..."))
            invalidate_server_token()
            await asyncio.sleep(MCP_CONNECT_RETRY_DELAY_SEC)
            continue

        async with stack:
            yield mcp, listing, token
        return


# ── Shared MCP session ──────────────────────────────────────────────────────────
# Opening a session costs ~10s on a loaded cluster (discover probe, initialize,
# tools/list), so one session is shared by every turn and reopened only when:
#
#   - the server token rotated (the session's HTTP client carries the old one), or
#   - the session broke: a transport error, or the server dropped it (-32600
#     "Session terminated", e.g. after an idle timeout).
#
# A background task opens and closes the session, never a request: anyio requires the
# task that opened a session to close it, and closing it in a request task got cancelled
# half-way whenever the browser stream ended.

# The error the MCP client raises once the server forgets the session. Only this pairing
# means the call never ran and is safe to repeat: -32600 alone is JSON-RPC's generic
# "Invalid Request", which the client also uses when a call may already have been processed.
MCP_SESSION_TERMINATED = (-32600, "Session terminated")


def is_session_terminated(exc: MCPError) -> bool:
    return (exc.code, exc.message) == MCP_SESSION_TERMINATED


class McpConnection:
    """One open MCP session, held open by its owner task until retired.

    `leases` counts the turns using it. A retired connection stays open until the last
    of them is done, so rotating the token never pulls a session out from under a turn.
    """

    def __init__(
        self, mcp: Client, listing: Any, token: str, stop: asyncio.Event, task: asyncio.Task
    ) -> None:
        self.mcp = mcp
        self.listing = listing
        self.token = token
        self.task = task
        self._stop = stop
        self.leases = 0
        self.retired = False

    @property
    def usable(self) -> bool:
        return not self.retired and not self.task.done()

    # Synchronous on purpose: a turn gives up its lease without awaiting anything, so a
    # cancelled turn cannot be interrupted mid-teardown. The owner task does the closing.
    def retire(self) -> None:
        self.retired = True
        if self.leases == 0:
            self._stop.set()

    def release(self) -> None:
        self.leases -= 1
        if self.retired and self.leases == 0:
            self._stop.set()


class McpPool:
    """Hands out the shared MCP session, opening a new one when the current can't serve."""

    def __init__(self) -> None:
        # Held across get-or-create, so turns arriving together share one handshake.
        self._lock = asyncio.Lock()
        self._conn: McpConnection | None = None

    async def acquire(self, send: Send | None = None) -> McpConnection:
        async with self._lock:
            token = await server_token()
            conn = self._conn
            if conn and conn.usable and conn.token == token:
                conn.leases += 1
                return conn
            if conn:
                reason = "token rotated" if conn.usable else "session closed"
                print(f"[MCP] Replacing shared session ({reason})")
                conn.retire()
                self._conn = None
            conn = await self._open(send)
            conn.leases += 1
            self._conn = conn
            return conn

    async def _open(self, send: Send | None) -> McpConnection:
        ready: asyncio.Future = asyncio.get_running_loop().create_future()
        stop = asyncio.Event()

        async def own() -> None:
            try:
                async with connect_mcp(send) as opened:
                    if ready.done():
                        return  # the asker left mid-handshake; just let the session close
                    ready.set_result(opened)
                    await stop.wait()
            except Exception as exc:  # noqa: BLE001 - reported to the waiter, or logged
                if not ready.done():
                    ready.set_exception(exc)
                else:
                    err = root_cause(exc)
                    print(f"[MCP] Shared session ended: {type(err).__name__}: {err}")
            except BaseException:
                # Cancellation, possibly grouped with other errors by anyio. Resolve the
                # waiter so a turn never waits forever on a handshake that is gone.
                if not ready.done():
                    ready.cancel()
                raise

        task = asyncio.create_task(own())
        try:
            mcp, listing, token = await ready
        except asyncio.CancelledError:
            stop.set()  # close the session once it opens rather than leave it ownerless
            if not asyncio.current_task().cancelling():
                # Not this turn that was cancelled but the handshake (e.g. at shutdown):
                # report a failure instead of a hang-up nobody is told about.
                raise RuntimeError("The MCP session closed while it was opening") from None
            raise
        return McpConnection(mcp, listing, token, stop, task)

    async def close(self) -> None:
        """Retire the current session and wait for it to close (app shutdown)."""
        async with self._lock:
            conn, self._conn = self._conn, None
        if conn:
            conn.leases = 0
            conn.retire()
            await asyncio.wait({conn.task}, timeout=10)


mcp_pool = McpPool()


class McpTurn:
    """One chat turn's handle on the shared MCP session.

    Exposes `call_tool` with Client's signature, so the tool code does not know the
    session is shared. A call that finds the session dropped is repeated once on a fresh
    one; any other connection failure retires the session for the next turn and surfaces
    the error, since the call may already have run.
    """

    def __init__(self, send: Send | None = None) -> None:
        self.send = send
        self.conn: McpConnection | None = None
        # Every connection this turn has leased. A replaced one is released only when the
        # turn ends, so a sibling call still in flight on it is not cut off.
        self._held: list[McpConnection] = []
        # Tool calls run concurrently; only one of them should swap the session.
        self._swap_lock = asyncio.Lock()

    async def __aenter__(self) -> "McpTurn":
        self.conn = await mcp_pool.acquire(self.send)
        self._held.append(self.conn)
        return self

    async def __aexit__(self, *exc_info: Any) -> None:
        for conn in self._held:
            conn.release()
        self._held.clear()
        self.conn = None

    @property
    def listing(self) -> Any:
        return self.conn.listing

    async def call_tool(self, name: str, arguments: dict) -> Any:
        for attempt in (1, 2):
            conn = self.conn
            try:
                return await conn.mcp.call_tool(name, arguments)
            except MCPError as exc:
                if attempt == 2 or not is_session_terminated(exc):
                    raise
                print(f"[MCP] {name}: session terminated by the server; reconnecting")
                await self._replace(conn)
            except Exception:
                # Transport-level failure: the session is suspect, but the call may have
                # reached the server, so it is not repeated.
                conn.retire()
                raise
        raise AssertionError("unreachable")

    async def _replace(self, failed: McpConnection) -> None:
        async with self._swap_lock:
            if self.conn is not failed:
                return  # a concurrent call already swapped it
            if self.send:
                self.send(status("Reconnecting to ThoughtSpot..."))
            failed.retire()
            self.conn = await mcp_pool.acquire(self.send)
            self._held.append(self.conn)


# ── Tools and prompt ────────────────────────────────────────────────────────────
# The Spotter 3 toolset: check_connectivity, search_objects (metadata only, never data),
# create_analysis_session, send_session_message, get_session_updates, create_dashboard.
# `list_orgs` / `switch_org` are OAuth-only and never appear on `/token/*`.
#
# Set ALLOWED_TOOLS to a list of names to restrict the agent. None allows everything the
# server exposes, which is the right default: the tool list is version-negotiated, so a
# hardcoded list silently drops tools added in later API versions.
ALLOWED_TOOLS: list[str] | None = None

POLL_TOOL = "get_session_updates"
POLL_INITIAL_DELAY = 0.75  # seconds before the first re-poll
POLL_MAX_DELAY = 4.0  # cap on the backoff
POLL_TIMEOUT = 300.0  # give up after this long without is_done

TOOL_STATUS = {
    "check_connectivity": "Checking the ThoughtSpot connection...",
    "search_objects": "Searching ThoughtSpot...",
    "create_analysis_session": "Starting an analysis session...",
    "send_session_message": "Asking the Analytics Agent...",
    POLL_TOOL: "Waiting for the Analytics Agent...",
    "create_dashboard": "Building the dashboard...",
}

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

# conv_id -> analytical_session_id from create_analysis_session, added to the system prompt
# on later turns so follow-ups continue in the same ThoughtSpot session.
analytical_sessions: dict[str, str] = {}


def build_tools(mcp_tools: list) -> list[dict]:
    """Convert MCP tool definitions to Anthropic tool definitions."""
    tools = [
        {"name": t.name, "description": t.description or "", "input_schema": t.input_schema}
        for t in mcp_tools
        if ALLOWED_TOOLS is None or t.name in ALLOWED_TOOLS
    ]
    # Cache the tool definitions: they are identical on every turn of every conversation
    # and sit at the front of the cacheable prefix.
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


def result_text(result: Any) -> str:
    return " ".join(getattr(c, "text", str(c)) for c in (result.content or []))


def tool_payload(result: Any) -> dict:
    """A tool result as JSON: `structured_content` when the tool declares an outputSchema
    (all Spotter 3 tools do), otherwise the JSON in the text block."""
    structured = getattr(result, "structured_content", None)
    if isinstance(structured, dict):
        return structured
    try:
        parsed = json.loads(result_text(result))
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


# ── Session updates ─────────────────────────────────────────────────────────────
# The default endpoint returns the server's digested updates; `enable-raw-session-updates`
# returns the Agent's own. The shapes differ:
#
#                     digested                  raw
#   prose chunks      `text_chunk`              `text-chunk`
#   progress          `step_notification`       `notification` (+ metadata.tool_title)
#   thinking marker   `is_thinking: true`       `metadata.type == "thinking"`
#   answer title      `answer_title`            `title`
#   answer URL        `iframe_url`              absent - the ids to build it are in metadata
#
# The helpers below read either shape.

TEXT_CHUNK_TYPES = ("text_chunk", "text-chunk")
TEXT_TYPES = ("text", *TEXT_CHUNK_TYPES)
PROGRESS_TYPES = ("step_notification", "notification")


def update_metadata(update: dict) -> dict:
    """An update's `metadata` (raw updates only), or {} when it has none."""
    metadata = update.get("metadata")
    return metadata if isinstance(metadata, dict) else {}


def is_thinking_update(update: dict) -> bool:
    """Whether an update is the Agent reasoning rather than answering."""
    return bool(update.get("is_thinking")) or update_metadata(update).get("type") == "thinking"


def update_text(update: dict) -> str:
    """The text of a progress update."""
    metadata = update_metadata(update)
    return (update.get("text") or metadata.get("tool_title") or metadata.get("title") or "").strip()


def answer_frame_params(update: dict) -> dict | None:
    """The ids that locate an answer, from a raw `answer` update.

    Raw mode has no rendered `iframe_url`, so the client builds one from these (the embed
    route's hash params sessionId / genNo / acSessionId / acGenNo).
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


def answer_fields(update: dict) -> dict:
    return {
        "title": update.get("answer_title") or update.get("title"),
        "query": update.get("answer_query") or update_metadata(update).get("sage_query"),
        # Digested mode only; in raw mode the client builds the URL from `frame_params`.
        "iframe_url": update.get("iframe_url"),
        "frame_params": answer_frame_params(update),
    }


def merge_text_chunks(updates: list[dict]) -> list[dict]:
    """Collapse runs of chunked prose updates into one `text` update.

    The model does not need the chunking, and each chunk costs a JSON envelope.
    """
    merged: list[dict] = []
    for update in updates:
        if update.get("type") in TEXT_CHUNK_TYPES and merged:
            previous = merged[-1]
            same_kind = is_thinking_update(previous) == is_thinking_update(update)
            if previous.get("type") in TEXT_TYPES and same_kind:
                previous["type"] = "text"
                previous["text"] = (previous.get("text") or "") + (update.get("text") or "")
                continue
            update = {**update, "type": "text"}
        merged.append(dict(update))
    return merged


def strip_rendered_answers(updates: list[dict]) -> list[dict]:
    """Drop `iframe_url` from what the model sees - the UI already rendered the chart."""
    cleaned = []
    for update in updates:
        if update.get("type") == "answer":
            update = {k: v for k, v in update.items() if k != "iframe_url"}
            update["rendered_in_ui"] = True
        cleaned.append(update)
    return cleaned


def emit_work_event(update: dict, send: Send) -> None:
    """Send one update as a step of the Agent's work, for the UI's "Show work" section.

    This is the Analytics Agent's own reasoning as the MCP server reports it - not
    Claude's. Steps are text only: a thinking answer must never become an `answer` event,
    because stored answers are resolved by their position among the non-thinking ones and
    counting a thinking answer there would shift every later chart onto the wrong answer.
    """
    kind = update.get("type")
    if kind == "answer":
        # The settled answer is the chart itself; only the attempts before it are work.
        if not is_thinking_update(update):
            return
        fields = answer_fields(update)
        # Sent even without a title: replay finds this answer by its position among the
        # turn's thinking answers, so each one needs a step.
        send(
            {
                "type": "work",
                "kind": "query",
                "text": (fields["title"] or "").strip(),
                "query": (fields["query"] or "").strip(),
                # Live only: they expire with the answer, so replay resolves a step
                # through /work-answers instead.
                "iframe_url": fields["iframe_url"],
                "frame_params": fields["frame_params"],
            }
        )
    elif kind in PROGRESS_TYPES:
        if text := update_text(update):
            send({"type": "work", "kind": "step", "text": text})
    elif kind in TEXT_TYPES and is_thinking_update(update):
        # Chunks are word-sized: keep their spacing, the receiver joins them.
        if text := update.get("text") or "":
            send({"type": "work", "kind": "thought", "text": text})


def emit_update_events(updates: list[dict], send: Send, show_work: bool = False) -> None:
    """Stream Analytics Agent progress to the browser while we poll."""
    for update in updates:
        if show_work:
            emit_work_event(update, send)
        kind = update.get("type")
        thinking = is_thinking_update(update)
        if kind == "answer":
            # The Agent emits an `answer` for each intermediate query it tries; only the
            # settled one is real (a three-question chat produced eleven answer updates
            # but one non-thinking one). ThoughtSpot's conversation history applies the
            # same flag, which keeps our answer order aligned with it - and that is what
            # makes a stored answer resolvable later.
            if not thinking:
                answer_id = update.get("answer_id")
                send({"type": "answer", "answer_id": answer_id, **answer_fields(update)})
        elif kind in PROGRESS_TYPES or (thinking and kind not in TEXT_TYPES):
            # Reasoning prose arrives in word-sized chunks and flickers as status, so only
            # steps are shown. The model still gets the prose in the tool result.
            if text := update_text(update):
                send(status(text))


def session_updates(payload: dict) -> list[dict]:
    return [u for u in payload.get("session_updates") or [] if isinstance(u, dict)]


async def autopoll_session_updates(
    mcp: McpTurn, arguments: dict, first_result: Any, send: Send, show_work: bool
) -> tuple[str, bool]:
    """Keep polling `get_session_updates` until the Agent is done.

    Each poll returns only updates not yet delivered, so we accumulate them and hand the
    model one consolidated result instead of spending a model turn per poll.
    """
    updates: list[dict] = []

    def absorb(result: Any) -> tuple[list[dict], bool]:
        payload = tool_payload(result)
        new = session_updates(payload)
        updates.extend(new)
        emit_update_events(new, send, show_work)
        return new, bool(payload.get("is_done"))

    _, is_done = absorb(first_result)
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

        new, is_done = absorb(result)
        # Reset the backoff whenever the Agent is actually producing output.
        delay = POLL_INITIAL_DELAY if new else min(delay * 1.5, POLL_MAX_DELAY)

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


async def call_tool(
    mcp: McpTurn, name: str, arguments: dict, send: Send, show_work: bool
) -> tuple[str, bool]:
    """Run one MCP tool call. Returns (result text for the model, is_error)."""
    try:
        result = await mcp.call_tool(name, arguments)
    except MCPError as exc:
        print(f"[MCP] Tool {name} failed: {exc}")
        return f"Tool call failed: {exc}", True

    is_error = bool(getattr(result, "is_error", False))
    if is_error or name != POLL_TOOL:
        return result_text(result), is_error
    return await autopoll_session_updates(mcp, arguments, result, send, show_work)


# ── Agent loop ──────────────────────────────────────────────────────────────────
class RefusedError(Exception):
    """Claude declined the request (stop_reason="refusal")."""


async def stream_claude(system: list, messages: list, tools: list, send: Send) -> Any:
    """One model call. Text streams to the browser as it arrives; returns the final message."""
    async with claude_client.beta.messages.stream(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=messages,
        tools=tools,
        **model_request_options(MODEL),
    ) as stream:
        async for event in stream:
            if event.type == "content_block_start":
                block = event.content_block
                if block.type == "tool_use":
                    send(status(TOOL_STATUS.get(block.name, "Querying ThoughtSpot...")))
                elif block.type == "thinking":
                    send(status("Thinking..."))
            elif event.type == "content_block_delta" and event.delta.type == "text_delta":
                send({"type": "delta", "text": event.delta.text})
        return await stream.get_final_message()


async def run_agent(
    messages: list, send: Send, conv_id: str, show_work: bool = False
) -> list:
    """Call Claude and run its tool calls on the MCP server until it stops asking for them.

    Returns the whole message history, tool interactions included, so follow-up turns keep
    the context that produced the answer.
    """
    async with McpTurn(send) as mcp:
        print(f"[MCP] {len(mcp.listing.tools)} tools: {[t.name for t in mcp.listing.tools]}")
        tools = build_tools(mcp.listing.tools)
        system = build_system(conv_id)

        while True:
            message = await stream_claude(system, messages, tools, send)

            if message.stop_reason == "refusal":
                details = getattr(message, "stop_details", None)
                category = f" ({details.category})" if details and details.category else ""
                raise RefusedError(f"The request was declined{category}. Try rephrasing it.")

            messages = [*messages, {"role": "assistant", "content": message.content}]
            if message.stop_reason != "tool_use":
                return messages

            # Run the tool calls concurrently and return every result in ONE user message:
            # splitting them teaches the model to stop making parallel calls.
            tool_uses = [b for b in message.content if b.type == "tool_use"]
            results = await asyncio.gather(
                *(call_tool(mcp, b.name, b.input, send, show_work) for b in tool_uses)
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
            messages = [*messages, {"role": "user", "content": tool_results}]


async def run_turn(
    messages: list,
    conv_id: str,
    send: Send,
    persist: Callable[[list | None], Awaitable[None]] | None = None,
    show_work: bool = False,
) -> None:
    """Run one chat turn, then end the stream with a `done` or an `error` event.

    `persist(history)` is awaited once: with the new history when the turn succeeds, or
    with the last stored one when it fails or is cancelled, so what the turn already
    produced is not lost.
    """
    persisted = False

    async def save(history: list | None) -> None:
        nonlocal persisted
        if persist and not persisted:
            persisted = True
            await persist(history)

    try:
        history = await run_agent(messages, send, conv_id, show_work)
        conversations[conv_id] = history
        await save(history)
        send({"type": "done", "response_id": conv_id})
    except BaseException as exc:  # noqa: BLE001 - surface anything to the UI
        err = root_cause(exc)
        cancelled = isinstance(err, asyncio.CancelledError)
        if not cancelled and not isinstance(exc, RefusedError):
            traceback.print_exception(exc)
        try:
            await save(conversations.get(conv_id))
        except Exception:  # noqa: BLE001 - a failed save must not hide the error event
            traceback.print_exc()
        if cancelled:
            raise  # the browser hung up mid-turn - nothing to report

        if isinstance(exc, RefusedError):
            message = str(exc)
        elif isinstance(exc, anthropic.APIStatusError):
            message = f"Claude API error {exc.status_code}"
        else:
            message = f"{type(err).__name__}: {err}"
        send({"type": "error", "message": message})


def sse_response(start_turn: Callable[[asyncio.Queue], Awaitable[None]]) -> StreamingResponse:
    """Run a turn in the background and stream the events it puts on a queue as SSE."""
    queue: asyncio.Queue = asyncio.Queue()
    task = asyncio.create_task(start_turn(queue))

    async def event_stream() -> AsyncGenerator[str, None]:
        finished = False
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") in ("done", "error"):
                    finished = True
                    break
        finally:
            # The browser hung up before the turn finished - don't leave the loop running.
            # After `done` the loop is only wrapping up, so let it.
            if not finished and not task.done():
                task.cancel()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── App ─────────────────────────────────────────────────────────────────────────
router = APIRouter()


@router.get("/api/ts-token")
async def ts_token():
    """Mint a short-lived ThoughtSpot token for the Visual Embed SDK.

    Called on every `getAuthToken`, so each call must return a NEW token (the SDK checks
    for duplicates) - which is why this is not served from the server's cache.
    """
    if not CAN_MINT_TOKENS:
        # No minting credentials: serve the static token so the demo still runs.
        return {"token": TS_AUTH_TOKEN, "minted": False}

    try:
        body = await mint_token(TS_TOKEN_VALIDITY_SEC)
    except TokenMintError as exc:
        print(f"[Auth] Token mint request failed: {exc}")
        raise HTTPException(
            status_code=exc.status_code, detail=f"ThoughtSpot token request failed: {exc}"
        ) from exc
    return {"token": body["token"], "minted": True}


@router.get("/api/health")
async def health():
    return {"status": "ok"}


@router.get("/api/tools")
async def list_mcp_tools():
    """Debug helper: what the MCP server exposes for this token and API version."""
    async with McpTurn() as mcp:
        listing = mcp.listing
    return {
        "url": MCP_URL,
        "tools": [{"name": t.name, "description": t.description} for t in listing.tools],
    }


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    refresher = asyncio.create_task(keep_server_token_fresh()) if CAN_MINT_TOKENS else None
    yield
    if refresher:
        refresher.cancel()
    # Close the shared MCP session so the server side is not left holding it.
    await mcp_pool.close()


def create_app(title: str = "ThoughtSpot Agent") -> FastAPI:
    app = FastAPI(title=title, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app
