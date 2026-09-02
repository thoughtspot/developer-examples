"""
Python agent: Anthropic Claude + the ThoughtSpot MCP server (Spotter 3 toolset),
with persistent chat history.

Same agent as `claude_agent_with_spotter3_mcp_server.py`, plus a SQLite chat history so past
conversations survive a restart and the UI can list, reopen and delete them.

FastAPI streams chat responses to the React frontend over Server-Sent Events.

Why client-side MCP: the ThoughtSpot MCP server's static-token endpoint needs custom
HTTP headers (Authorization + x-ts-host). Anthropic's server-side MCP connector cannot
send those, so this process connects to the MCP server itself and executes tool calls.

Three things this server does that a plain pass-through loop does not:

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

3. Chat history is persisted in SQLite, in two layers (see CHAT HISTORY below).

MCP server: https://github.com/thoughtspot/mcp-server
"""

import asyncio
import json
import os
import sqlite3
import time
import traceback
import uuid
from collections.abc import AsyncGenerator, AsyncIterator, Callable
from contextlib import AsyncExitStack, asynccontextmanager, closing
from datetime import datetime, timezone
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

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    refresher = asyncio.create_task(keep_server_token_fresh()) if CAN_MINT_TOKENS else None
    yield
    if refresher:
        refresher.cancel()
    # Close the shared MCP session so the server side is not left holding it.
    await mcp_pool.close()


app = FastAPI(title="ThoughtSpot Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Anthropic ───────────────────────────────────────────────────────────────────
claude_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Haiku 4.5: the agent only orchestrates ThoughtSpot's tools - pick a tool, pass the
# question on, summarise the answer - and the Analytics Agent does the analysis. Measured
# on one question, Haiku's four model calls took ~4s in total, against ~17s on Sonnet 5
# and ~8s on Opus 5. Set ANTHROPIC_MODEL=claude-sonnet-5 for stronger reasoning on
# multi-step follow-ups, or claude-opus-5 for the most capable.
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
MAX_TOKENS = 16000

# Safety classifiers can decline a request (HTTP 200, stop_reason="refusal"). The
# server-side fallback beta re-routes those to a fallback model automatically - but
# only models with published fallback targets accept it. Sonnet 5 and Haiku 4.5 have
# none (`allowed_fallback_models` is empty on /v1/models), so for them a refusal is
# simply reported to the user.
REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_CAPABLE_MODELS = ("claude-opus-5", "claude-fable-5-1")


def model_request_options(model: str) -> dict:
    """The thinking and fallback options this model accepts."""
    options: dict[str, Any] = {}
    # Haiku 4.5 predates adaptive thinking (it would need a fixed `budget_tokens`).
    # Choosing tools does not need extended reasoning, so run it without thinking -
    # that is also the fastest configuration.
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

# Headers for the MCP session are built per request by `mcp_headers()` below, so a
# long-running process picks up a renewed token instead of holding an expired one.

# ── ThoughtSpot tokens ──────────────────────────────────────────────────────────
# Two consumers, two policies:
#
#   The browser. The Visual Embed SDK requires a FRESH token from every `getAuthToken`
#   call. Handing it the same static token twice trips its duplicate-token check the
#   moment the token stops verifying, and the callback can never recover because it
#   returns the same string. So `/api/ts-token` mints one per request.
#
#   This server, for its own MCP and REST calls. A static TS_AUTH_TOKEN eventually
#   expires, and when it does every tool call fails with "Failed to validate
#   connection" while the tool *list* still succeeds - so the app looks healthy right
#   up until someone asks a question. Instead we mint one and cache it until shortly
#   before it expires. TS_AUTH_TOKEN stays as the fallback for when no minting
#   credentials are configured.
#
# Minting needs a username plus either the cluster secret key (Develop > Customizations
# > Security Settings > Trusted authentication) or that user's password. `secret_key`
# takes precedence when both are set.
TS_EMBED_USERNAME = os.getenv("TS_EMBED_USERNAME")
TS_SECRET_KEY = os.getenv("TS_SECRET_KEY")
TS_EMBED_PASSWORD = os.getenv("TS_EMBED_PASSWORD")
TS_TOKEN_VALIDITY_SEC = int(os.getenv("TS_TOKEN_VALIDITY_SEC", "1800"))

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


# Renew this long before the token actually expires, so a call already in flight does
# not race the expiry.
TOKEN_REFRESH_MARGIN_SEC = 120
# The server's own token. Longer-lived than the browser's: it is never handed out, and
# a longer life means fewer mints on a slow cluster.
SERVER_TOKEN_VALIDITY_SEC = int(os.getenv("TS_SERVER_TOKEN_VALIDITY_SEC", "3600"))

_server_token: str | None = None
# Wall-clock (time.time()) instant to renew at. Not time.monotonic(): on macOS that clock
# stops while the machine sleeps, so after a laptop sleep the cache would keep serving a
# token the cluster has already expired.
_server_token_expiry = 0.0
# When the background task renews the token - well before `_server_token_expiry`, so no
# request has to wait on a mint. Minting can take 40s on a loaded cluster, and a request
# that finds the token expired pays all of it.
_server_token_refresh_at = 0.0
# Serialises minting: an agent turn fires several tool calls at once, and without this
# they would each mint a token on a cold cache.
_server_token_lock = asyncio.Lock()

# Renew this long before the token expires. Capped at half the token's life, so a short
# cluster-imposed lifetime still gets renewed at a sane interval.
TOKEN_BACKGROUND_LEAD_SEC = 720
# After a failed background mint, try again this soon. The current token keeps serving.
TOKEN_BACKGROUND_RETRY_SEC = 30.0
# The background loop re-reads the wall clock at least this often, so it notices when a
# laptop sleep has carried it past the renewal time (asyncio.sleep pauses with the host).
TOKEN_BACKGROUND_TICK_SEC = 60.0


class TokenMintError(Exception):
    """The cluster would not issue a token."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


async def mint_token(validity_sec: int) -> dict:
    """Ask ThoughtSpot for a bearer token. Returns the parsed response body."""
    payload: dict[str, Any] = {
        "username": TS_EMBED_USERNAME,
        "validity_time_in_sec": validity_sec,
    }
    # secret_key wins over password when both are present, per the REST API contract.
    if TS_SECRET_KEY:
        payload["secret_key"] = TS_SECRET_KEY
    else:
        payload["password"] = TS_EMBED_PASSWORD

    # This endpoint is occasionally slow to respond - 15s is normal on a loaded
    # cluster - and a bare timeout would surface as an unhandled 500 with no
    # explanation.
    try:
        async with httpx2.AsyncClient(timeout=httpx2.Timeout(10.0, read=90.0)) as client:
            response = await client.post(
                f"{TS_HOST.rstrip('/')}/api/rest/2.0/auth/token/full", json=payload
            )
    except httpx2.HTTPError as exc:
        raise TokenMintError(f"{type(exc).__name__}", 504) from exc

    if response.status_code != 200:
        # Surface the cluster's own reason (bad secret key, trusted auth disabled, ...)
        # rather than a blank 500 the browser cannot explain.
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

    # Fast path, outside the lock: a valid token never waits on a mint in progress -
    # the background renewal holds the lock for as long as the cluster takes.
    if server_token_valid():
        return _server_token

    async with _server_token_lock:
        if server_token_valid():
            return _server_token
        try:
            return await mint_server_token()
        except TokenMintError as exc:
            # Keep serving the token we have: an expiring token still beats no token,
            # and the next call retries the mint.
            fallback = _server_token or TS_AUTH_TOKEN
            if not fallback:
                raise
            print(f"[Auth] Could not mint a server token ({exc}); using the previous one.")
            return fallback


async def keep_server_token_fresh() -> None:
    """Background task: mint at startup, then renew ahead of expiry.

    Renewing on demand still works - this only moves the wait off the request path.
    """
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


async def mcp_headers() -> dict:
    """Auth headers for an MCP session, with a token that is current right now."""
    return {"Authorization": f"Bearer {await server_token()}", "x-ts-host": TS_HOST}

# Long read timeout: MCP replies stream over SSE and the Analytics Agent is slow.
MCP_TIMEOUT = httpx2.Timeout(30.0, read=300.0)

# The MCP server's `initialize` intermittently fails with a bare HTTP 500 (surfaced as
# "MCPError: Server returned an error response") that a second attempt gets past. So a
# failed handshake is retried once. The retry also mints a fresh token - cheap, and it
# rules the token out. Only the handshake is retried: past it, the turn has streamed
# output to the browser and cannot be replayed.
MCP_CONNECT_ATTEMPTS = 2
MCP_CONNECT_RETRY_DELAY_SEC = 2.0


def root_cause(exc: BaseException) -> BaseException:
    """anyio wraps transport failures in ExceptionGroups; unwrap to the first leaf."""
    while getattr(exc, "exceptions", None):
        exc = exc.exceptions[0]
    return exc


@asynccontextmanager
async def connect_mcp(
    send_status: Callable[[dict], None] | None = None,
) -> AsyncIterator[tuple[Client, Any, str]]:
    """An initialised MCP session, its tool listing and the bearer token it runs on.

    Retries a failed handshake once.
    """
    for attempt in range(1, MCP_CONNECT_ATTEMPTS + 1):
        stack = AsyncExitStack()
        try:
            headers = await mcp_headers()
            token = headers["Authorization"].removeprefix("Bearer ")
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
            if send_status:
                send_status({"type": "status", "message": "Reconnecting to ThoughtSpot..."})
            invalidate_server_token()
            await asyncio.sleep(MCP_CONNECT_RETRY_DELAY_SEC)
            continue

        async with stack:
            yield mcp, listing, token
        return


# ── Shared MCP session ──────────────────────────────────────────────────────────
#
# Opening an MCP session costs ~10s on a loaded cluster (discover probe, initialize,
# tools/list - each several seconds), which used to be paid on every chat message. One
# session is now shared by every turn and reopened only when it has to be:
#
#   - the server token rotated (the session's HTTP client carries the old one), or
#   - the session broke: a transport error, or the server dropped it (-32600
#     "Session terminated", e.g. after an idle timeout).
#
# The session is opened and closed by its own background task, never by a request.
# anyio requires a session to be closed by the task that opened it, and closing it in
# a request task is what used to get cancelled half-way when the browser stream ended.

# What the MCP client raises once the server no longer knows the session: -32600 with
# the message "Session terminated". Only that pairing means the call never ran and is
# safe to repeat. -32600 alone is not enough - it is JSON-RPC's generic "Invalid
# Request", which the client also uses when a call may already have been processed.
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

    # Both of these are synchronous on purpose: a turn gives up its lease without
    # awaiting anything, so a cancelled turn cannot be interrupted mid-teardown. The
    # owner task does the actual closing.
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
        # Held across get-or-create, so turns arriving together share one handshake
        # instead of each opening a session.
        self._lock = asyncio.Lock()
        self._conn: McpConnection | None = None

    async def acquire(self, send_status: Callable[[dict], None] | None = None) -> McpConnection:
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
            conn = await self._open(send_status)
            conn.leases += 1
            self._conn = conn
            return conn

    async def _open(self, send_status: Callable[[dict], None] | None) -> McpConnection:
        ready: asyncio.Future = asyncio.get_running_loop().create_future()
        stop = asyncio.Event()

        async def own() -> None:
            try:
                async with connect_mcp(send_status) as opened:
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
            # Close the session once it opens rather than leave it with no owner.
            stop.set()
            if not asyncio.current_task().cancelling():
                # This turn was not cancelled - the handshake was (e.g. at shutdown).
                # Report it as a failure, not as a hang-up nobody is told about.
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
    session is shared. A call that finds the session dropped is repeated once on a
    fresh one; any other connection failure retires the session for the next turn
    and surfaces the error, since the call may already have run.
    """

    def __init__(self, send_status: Callable[[dict], None] | None = None) -> None:
        self.send_status = send_status
        self.conn: McpConnection | None = None
        # Every connection this turn has leased. A replaced one is released only when
        # the turn ends, so a sibling call still in flight on it is not cut off.
        self._held: list[McpConnection] = []
        # Tool calls run concurrently; only one of them should swap the session.
        self._swap_lock = asyncio.Lock()

    async def __aenter__(self) -> "McpTurn":
        self.conn = await mcp_pool.acquire(self.send_status)
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
                # Transport-level failure: the session is suspect, but the call may
                # have reached the server, so it is not repeated.
                conn.retire()
                raise
        raise AssertionError("unreachable")

    async def _replace(self, failed: McpConnection) -> None:
        async with self._swap_lock:
            if self.conn is not failed:
                return  # a concurrent call already swapped it
            if self.send_status:
                self.send_status({"type": "status", "message": "Reconnecting to ThoughtSpot..."})
            failed.retire()
            self.conn = await mcp_pool.acquire(self.send_status)
            self._held.append(self.conn)

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


# ════════════════════════════════════════════════════════════════════════════════
# CHAT HISTORY
#
# Stored in two layers, because the browser and the model need different things:
#
#   turns          - what the UI renders: user text, assistant text, and the answer
#                    iframe_urls so reopening a conversation replays its charts.
#   claude_messages - the raw Claude message list for the conversation, tool_use and
#                    tool_result blocks included. This is what gets replayed into the
#                    next request so follow-ups keep full context after a restart.
#
# The ThoughtSpot MCP server has its own conversation storage, but that is internal
# plumbing for `get_session_updates` delivery (read/write bookmarks, short TTL) - it is
# not a client-facing history API. Chat history belongs to the app, so it lives here.
#
# SQLite via the stdlib, so there is no extra dependency. Calls are small and run in a
# worker thread (`asyncio.to_thread`) to keep the event loop free.
# ════════════════════════════════════════════════════════════════════════════════

DB_PATH = Path(
    os.getenv("CHAT_HISTORY_DB", Path(__file__).resolve().parent / "chat_history.db")
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id                    TEXT PRIMARY KEY,
    title                 TEXT NOT NULL,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    analytical_session_id TEXT,
    claude_messages       TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS turns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    answers         TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS turns_by_conversation ON turns (conversation_id, id);
"""

TITLE_MAX_LEN = 60


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # concurrent reads while a turn is written
    conn.execute("PRAGMA foreign_keys=ON")  # so deleting a conversation drops its turns
    return conn


def db_init() -> None:
    with closing(db_connect()) as conn, conn:
        conn.executescript(SCHEMA)
    print(f"[History] SQLite at {DB_PATH}")


db_init()


def jsonable(value: Any) -> Any:
    """Make a Claude message list JSON-serializable.

    Assistant turns hold SDK block objects (text, thinking, tool_use). `model_dump`
    keeps every field the API needs on replay - including a thinking block's
    `signature`, which must come back unchanged.
    """
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        return dump(mode="json", exclude_none=True)
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    return value


def db_start_conversation(conv_id: str, first_message: str) -> None:
    """Create the conversation row if this is its first turn."""
    title = first_message.strip().splitlines()[0][:TITLE_MAX_LEN] or "New chat"
    stamp = now_iso()
    with closing(db_connect()) as conn, conn:
        conn.execute(
            """
            INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (conv_id, title, stamp, stamp),
        )


def db_add_turn(conv_id: str, role: str, content: str, answers: list[dict]) -> None:
    with closing(db_connect()) as conn, conn:
        conn.execute(
            "INSERT INTO turns (conversation_id, role, content, answers, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (conv_id, role, content, json.dumps(answers), now_iso()),
        )
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?", (now_iso(), conv_id)
        )


def db_save_state(
    conv_id: str, claude_messages: list, analytical_session_id: str | None
) -> None:
    """Persist the raw Claude history + ThoughtSpot session for the next turn."""
    with closing(db_connect()) as conn, conn:
        conn.execute(
            "UPDATE conversations SET claude_messages = ?, analytical_session_id = ?,"
            " updated_at = ? WHERE id = ?",
            (
                json.dumps(jsonable(claude_messages)),
                analytical_session_id,
                now_iso(),
                conv_id,
            ),
        )


def db_load_state(conv_id: str) -> tuple[list, str | None]:
    with closing(db_connect()) as conn:
        row = conn.execute(
            "SELECT claude_messages, analytical_session_id FROM conversations WHERE id = ?",
            (conv_id,),
        ).fetchone()
    if not row:
        return [], None
    try:
        messages = json.loads(row["claude_messages"])
    except (ValueError, TypeError):
        messages = []
    return messages, row["analytical_session_id"]


def db_list_conversations(limit: int = 100) -> list[dict]:
    with closing(db_connect()) as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM turns t WHERE t.conversation_id = c.id) AS turn_count
            FROM conversations c
            WHERE EXISTS (SELECT 1 FROM turns t WHERE t.conversation_id = c.id)
            ORDER BY c.updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def db_get_conversation(conv_id: str) -> dict | None:
    with closing(db_connect()) as conn:
        row = conn.execute(
            "SELECT id, title, created_at, updated_at, analytical_session_id"
            " FROM conversations WHERE id = ?",
            (conv_id,),
        ).fetchone()
        if not row:
            return None
        turns = conn.execute(
            "SELECT role, content, answers, created_at FROM turns"
            " WHERE conversation_id = ? ORDER BY id",
            (conv_id,),
        ).fetchall()

    replayed_turns = []
    for turn in turns:
        # Also stripped on the way out, so rows written before this change - which
        # still hold an `iframe_url` - take the same resolve-on-replay path instead
        # of rendering a URL that has almost certainly expired.
        answers = storable_answers(json.loads(turn["answers"] or "[]"))
        replayed_turns.append(
            {
                "role": turn["role"],
                "content": turn["content"],
                "answers": answers,
                "created_at": turn["created_at"],
            }
        )

    return {**dict(row), "turns": replayed_turns}


def db_delete_conversation(conv_id: str) -> bool:
    with closing(db_connect()) as conn, conn:
        deleted = conn.execute(
            "DELETE FROM conversations WHERE id = ?", (conv_id,)
        ).rowcount
    return deleted > 0


def db_rename_conversation(conv_id: str, title: str) -> bool:
    with closing(db_connect()) as conn, conn:
        updated = conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title.strip()[:TITLE_MAX_LEN] or "New chat", now_iso(), conv_id),
        ).rowcount
    return updated > 0


# Hot caches in front of SQLite, so an active conversation does not re-read the DB on
# every turn. Both fall back to the stored state on a miss (e.g. after a restart).
conversations: dict[str, list] = {}
analytical_sessions: dict[str, str] = {}


async def load_conversation_state(conv_id: str) -> list:
    """Claude message history for a conversation, from cache or SQLite."""
    if conv_id in conversations:
        return conversations[conv_id]

    messages, session_id = await asyncio.to_thread(db_load_state, conv_id)
    conversations[conv_id] = messages
    if session_id:
        analytical_sessions[conv_id] = session_id
    return messages


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


class RenameRequest(BaseModel):
    title: str


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


class StreamRecorder:
    """Fans every SSE event out to the browser and to the transcript we persist.

    The UI's rendering of a turn is exactly the events it received, so recording them
    here is what makes a reopened conversation look like the live one.
    """

    def __init__(self, queue: asyncio.Queue) -> None:
        self.queue = queue
        self.text_parts: list[str] = []
        self.answers: list[dict] = []
        self.persisted = False  # guards against writing the assistant turn twice

    def send(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "delta":
            self.text_parts.append(event.get("text") or "")
        elif kind == "answer":
            self.answers.append(
                {
                    "answer_id": event.get("answer_id"),
                    "title": event.get("title"),
                    "query": event.get("query"),
                    "iframe_url": event.get("iframe_url"),
                }
            )
        self.queue.put_nowait(event)

    @property
    def text(self) -> str:
        return "".join(self.text_parts)


def storable_answers(answers: list[dict]) -> list[dict]:
    """Strip the parts of an answer that go stale, keeping what survives.

    An answer object lives about 8 hours on the ThoughtSpot side. After that the
    `iframe_url` - and the `answer_id` the MCP server hands us, which is really a
    `{session_id, gen_no}` pair - point at something that no longer exists, so a
    reopened chat would render a row of error tiles.

    We therefore persist only the durable parts. On replay the client asks the
    Visual Embed SDK to resolve a live URL from the conversation id plus the
    answer's position, so the chart is re-run against current data.
    """
    return [
        {k: v for k, v in answer.items() if k not in ("iframe_url", "answer_id")}
        for answer in answers
    ]


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


def emit_update_events(updates: list[dict], recorder: StreamRecorder) -> None:
    """Stream Analytics Agent progress to the browser while we poll."""
    for update in updates:
        if not isinstance(update, dict):
            continue
        kind = update.get("type")
        if kind == "answer":
            # The Agent emits an `answer` for each intermediate query it tries while
            # reasoning. Only the settled one is a real answer: a three-question chat
            # produced eleven answer updates but a single non-thinking one. Skipping
            # the rest keeps the transcript to the charts that actually answer the
            # question, and - because `getConversation` applies the same flag - keeps
            # our answer order aligned with ThoughtSpot's, which is what makes a
            # stored answer resolvable later.
            if is_thinking_update(update):
                continue
            metadata = update_metadata(update)
            recorder.send(
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
        elif kind in ("step_notification", "notification") or (
            # Reasoning prose streams in word-sized chunks; shown as status it flickers
            # one fragment at a time. The model still gets it in the tool result.
            is_thinking_update(update)
            and kind not in ("text", *TEXT_CHUNK_TYPES)
        ):
            metadata = update_metadata(update)
            text = (
                update.get("text") or metadata.get("tool_title") or metadata.get("title") or ""
            ).strip()
            if text:
                recorder.send({"type": "status", "message": text})


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
    mcp: McpTurn, name: str, arguments: dict, recorder: StreamRecorder
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

    return await autopoll_session_updates(mcp, arguments, result, recorder)


async def timed_call_tool(
    mcp: McpTurn, name: str, arguments: dict, recorder: StreamRecorder
) -> tuple[str, bool]:
    """call_tool, logging how long the tool took (autopoll included)."""
    start = time.perf_counter()
    try:
        return await call_tool(mcp, name, arguments, recorder)
    finally:
        print(f"[Timing] tool {name}: {time.perf_counter() - start:.1f}s", flush=True)


async def autopoll_session_updates(
    mcp: McpTurn, arguments: dict, first_result: Any, recorder: StreamRecorder
) -> tuple[str, bool]:
    """Keep polling `get_session_updates` until the Agent is done.

    Each poll returns only updates not yet delivered, so we accumulate them and hand
    the model one consolidated result instead of spending a model turn per poll.
    """
    payload = tool_payload(first_result)
    updates: list[dict] = list(payload.get("session_updates") or [])
    is_done = bool(payload.get("is_done"))
    emit_update_events(updates, recorder)

    deadline = time.monotonic() + POLL_TIMEOUT
    delay = POLL_INITIAL_DELAY
    polls = 1

    while not is_done:
        if time.monotonic() > deadline:
            print(f"[MCP] {POLL_TOOL} timed out after {POLL_TIMEOUT}s")
            break

        await asyncio.sleep(delay)
        try:
            result = await mcp.call_tool(POLL_TOOL, arguments)
            polls += 1
        except MCPError as exc:
            print(f"[MCP] {POLL_TOOL} poll failed: {exc}")
            return f"Polling for session updates failed: {exc}", True

        if getattr(result, "is_error", False):
            return result_text(result), True

        payload = tool_payload(result)
        new_updates = list(payload.get("session_updates") or [])
        is_done = bool(payload.get("is_done"))
        updates.extend(new_updates)
        emit_update_events(new_updates, recorder)

        # Reset the backoff whenever the Agent is actually producing output.
        delay = POLL_INITIAL_DELAY if new_updates else min(delay * 1.5, POLL_MAX_DELAY)

    print(f"[Timing] {POLL_TOOL}: {polls} poll(s), is_done={is_done}", flush=True)
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


class RefusedError(Exception):
    """Claude declined the request (stop_reason="refusal")."""


async def agent_loop(messages: list, recorder: StreamRecorder, conv_id: str) -> None:
    """Client-side agentic loop against the ThoughtSpot MCP server."""
    # Elapsed-time markers for the [Timing] lines: uvicorn's log carries no timestamps,
    # and these split a slow turn into MCP handshake, Claude hops and tool calls.
    turn_start = time.perf_counter()
    hop = 0
    try:
        async with McpTurn(recorder.send) as mcp:
            listing = mcp.listing
            print(f"[Timing] MCP session ready: {time.perf_counter() - turn_start:.1f}s", flush=True)
            print(f"[MCP] {len(listing.tools)} tools: {[t.name for t in listing.tools]}")

            tools = build_tools(listing.tools)
            system = build_system(conv_id)
            current_messages = messages[:]

            while True:
                hop += 1
                hop_start = time.perf_counter()
                first_event_at: float | None = None
                async with claude_client.beta.messages.stream(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=system,
                    messages=current_messages,
                    tools=tools,
                    **model_request_options(MODEL),
                ) as stream:
                    async for event in stream:
                        kind = getattr(event, "type", None)
                        if first_event_at is None and kind == "content_block_start":
                            first_event_at = time.perf_counter()
                        if kind == "content_block_start":
                            block_type = getattr(event.content_block, "type", None)
                            if block_type == "tool_use":
                                recorder.send(
                                    {
                                        "type": "status",
                                        "message": tool_status(event.content_block.name),
                                    }
                                )
                            elif block_type == "thinking":
                                recorder.send(
                                    {"type": "status", "message": "Thinking..."}
                                )
                        elif kind == "content_block_delta":
                            delta = event.delta
                            if getattr(delta, "type", None) == "text_delta":
                                recorder.send({"type": "delta", "text": delta.text})

                    final_message = await stream.get_final_message()

                hop_end = time.perf_counter()
                usage = getattr(final_message, "usage", None)
                print(
                    f"[Timing] Claude hop {hop}: {hop_end - hop_start:.1f}s "
                    f"(first block {((first_event_at or hop_end) - hop_start):.1f}s, "
                    f"stop={final_message.stop_reason}, "
                    f"out_tokens={getattr(usage, 'output_tokens', '?')}, "
                    f"in_tokens={getattr(usage, 'input_tokens', '?')}, "
                    f"cache_read={getattr(usage, 'cache_read_input_tokens', '?')})",
                    flush=True,
                )

                if final_message.stop_reason == "refusal":
                    details = getattr(final_message, "stop_details", None)
                    raise RefusedError(
                        "The request was declined"
                        + (f" ({details.category})" if details and details.category else "")
                        + ". Try rephrasing it."
                    )

                if final_message.stop_reason != "tool_use":
                    break

                # Run the turn's tool calls concurrently, then return every result
                # in a single user message - splitting them teaches the model to
                # stop making parallel calls.
                tool_uses = [
                    b for b in final_message.content if getattr(b, "type", None) == "tool_use"
                ]
                tools_start = time.perf_counter()
                results = await asyncio.gather(
                    *(timed_call_tool(mcp, b.name, b.input, recorder) for b in tool_uses)
                )
                print(
                    f"[Timing] tool round after hop {hop}: "
                    f"{time.perf_counter() - tools_start:.1f}s for {len(tool_uses)} call(s)",
                    flush=True,
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

            # Keep the whole history, tool interactions included, so follow-up turns
            # keep the context that produced the answer. Cached in memory and stored
            # in SQLite so it survives a restart.
            history = current_messages + [
                {"role": "assistant", "content": final_message.content}
            ]
            conversations[conv_id] = history
            await persist_turn(conv_id, recorder, history)
            recorder.send({"type": "done", "response_id": conv_id})
            print(
                f"[Timing] turn total: {time.perf_counter() - turn_start:.1f}s "
                f"over {hop} Claude hop(s)",
                flush=True,
            )

    except asyncio.CancelledError:
        # The browser hung up mid-turn. Keep what the turn produced; nothing to report.
        await persist_turn_quietly(conv_id, recorder, conversations.get(conv_id))
        raise
    except RefusedError as exc:
        await persist_turn_quietly(conv_id, recorder, conversations.get(conv_id))
        recorder.send({"type": "error", "message": str(exc)})
    except anthropic.APIStatusError as exc:
        traceback.print_exc()
        await persist_turn_quietly(conv_id, recorder, conversations.get(conv_id))
        recorder.send({"type": "error", "message": f"Claude API error {exc.status_code}"})
    except BaseException as exc:  # noqa: BLE001 - surface anything to the UI
        # anyio wraps transport failures in ExceptionGroups; unwrap to the root cause.
        err = root_cause(exc)
        await persist_turn_quietly(conv_id, recorder, conversations.get(conv_id))
        if isinstance(err, asyncio.CancelledError):
            raise  # a hang-up that reached us wrapped - still not an error
        traceback.print_exc()
        recorder.send({"type": "error", "message": f"{type(err).__name__}: {err}"})


async def persist_turn_quietly(
    conv_id: str, recorder: StreamRecorder, history: list | None
) -> None:
    """persist_turn for the error paths: a failed save is logged, never raised, so the
    browser still gets its `error` event instead of a stream that never ends."""
    try:
        await persist_turn(conv_id, recorder, history)
    except Exception:  # noqa: BLE001
        traceback.print_exc()


async def persist_turn(
    conv_id: str, recorder: StreamRecorder, history: list | None
) -> None:
    """Write the assistant turn, and the state the next turn needs, to SQLite.

    Called on the failure paths too: the user turn is already stored, so skipping this
    would leave a question with no visible answer when the conversation is reopened.
    """
    if recorder.persisted:
        return
    recorder.persisted = True

    if recorder.text or recorder.answers:
        await asyncio.to_thread(
            db_add_turn, conv_id, "assistant", recorder.text, storable_answers(recorder.answers)
        )
    if history is not None:
        await asyncio.to_thread(
            db_save_state, conv_id, history, analytical_sessions.get(conv_id)
        )


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

    history = await load_conversation_state(conv_id)
    messages = history + [{"role": "user", "content": request.message}]

    await asyncio.to_thread(db_start_conversation, conv_id, request.message)
    await asyncio.to_thread(db_add_turn, conv_id, "user", request.message, [])

    queue: asyncio.Queue = asyncio.Queue()
    recorder = StreamRecorder(queue)
    task = asyncio.create_task(agent_loop(messages, recorder, conv_id))

    async def event_stream() -> AsyncGenerator[str, None]:
        finished = False
        try:
            while True:
                item = await queue.get()
                yield format_sse(item)
                if item.get("type") in ("done", "error"):
                    finished = True
                    break
        finally:
            # The browser hung up before the turn finished - don't leave the loop
            # running. After `done` the loop is only wrapping up, so let it.
            if not finished and not task.done():
                task.cancel()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Chat history endpoints ──────────────────────────────────────────────────────


async def ts_answers_per_message(session_id: str) -> list[int] | None:
    """How many real answers ThoughtSpot holds for each turn of a conversation.

    Returns one count per conversation message, oldest first, or None if the
    conversation cannot be read.
    """
    url = (
        f"{TS_HOST.rstrip('/')}/api/rest/2.0/ai/agent/conversations/"
        f"{session_id}/messages"
    )
    try:
        async with httpx2.AsyncClient(timeout=httpx2.Timeout(10.0, read=45.0)) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {await server_token()}",
                    "Accept": "application/json",
                },
            )
        if response.status_code != 200:
            print(f"[History] getConversation {session_id} -> {response.status_code}")
            return None
        return [
            sum(
                1
                for item in (message.get("response_items") or [])
                if item.get("type") == "answer" and item.get("is_thinking") is False
            )
            for message in (response.json().get("messages") or [])
        ]
    except (httpx2.HTTPError, ValueError, TypeError) as exc:
        print(f"[History] getConversation {session_id} failed: {type(exc).__name__}: {exc}")
        return None


def reconcile_answers(conversation: dict, ts_counts: list[int] | None) -> dict:
    """Align a stored conversation with the answers ThoughtSpot actually holds.

    Two things make the stored copy an unreliable source of truth:

    - A stream can be cut off - the browser navigates away, the process restarts -
      after the Agent has already been asked. The Agent finishes anyway, so the
      answer exists on ThoughtSpot's side while our turn recorded none of it.
    - `answer_index` has to count the way ThoughtSpot counts, or a replayed answer
      resolves to the wrong chart.

    So ThoughtSpot decides how many answers each turn has, and the stored rows only
    supply titles. A turn missing answers gets untitled placeholders; the client
    renders them, and the SDK resolves each one by its index.
    """
    turns = conversation.get("turns") or []
    if ts_counts is None:
        # Fall back to the stored shape rather than dropping charts entirely.
        index = 0
        for turn in turns:
            for answer in turn.get("answers") or []:
                answer["answer_index"] = index
                index += 1
        return conversation

    # One ThoughtSpot message per user prompt, so pair them with the assistant turns
    # in order - that is the same order both sides appended in.
    assistant_turns = [turn for turn in turns if turn.get("role") == "assistant"]
    index = 0
    for position, turn in enumerate(assistant_turns):
        expected = ts_counts[position] if position < len(ts_counts) else 0
        answers = turn.get("answers") or []
        # Titles we recorded, padded out to the count ThoughtSpot reports.
        merged = answers[:expected] + [{} for _ in range(max(0, expected - len(answers)))]
        for answer in merged:
            answer["answer_index"] = index
            index += 1
        turn["answers"] = merged
    return conversation


@app.get("/api/conversations")
async def list_conversations():
    return {"conversations": await asyncio.to_thread(db_list_conversations)}


@app.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conversation = await asyncio.to_thread(db_get_conversation, conv_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    session_id = conversation.get("analytical_session_id")
    ts_counts = await ts_answers_per_message(session_id) if session_id else None
    return reconcile_answers(conversation, ts_counts)


@app.patch("/api/conversations/{conv_id}")
async def rename_conversation(conv_id: str, request: RenameRequest):
    if not await asyncio.to_thread(db_rename_conversation, conv_id, request.title):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "ok"}


@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    if not await asyncio.to_thread(db_delete_conversation, conv_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversations.pop(conv_id, None)
    analytical_sessions.pop(conv_id, None)
    return {"status": "deleted"}


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

    # Deliberately not served from the server's cache: the SDK wants a new token each
    # time, and reusing one risks its duplicate-token check.
    try:
        body = await mint_token(TS_TOKEN_VALIDITY_SEC)
    except TokenMintError as exc:
        print(f"[Auth] Token mint request failed: {exc}")
        raise HTTPException(
            status_code=exc.status_code, detail=f"ThoughtSpot token request failed: {exc}"
        ) from exc

    return {"token": body["token"], "minted": True}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/tools")
async def list_mcp_tools():
    """Debug helper: what the MCP server exposes for this token and API version."""
    async with McpTurn() as mcp:
        listing = mcp.listing
    return {
        "url": MCP_URL,
        "tools": [{"name": t.name, "description": t.description} for t in listing.tools],
    }
