"""
Python agent: Anthropic Claude + the ThoughtSpot MCP server (Spotter 3 toolset),
with persistent chat history.

The same agent as `claude_agent_with_spotter3_mcp_server.py` (the agent lives in
`spotter3_core.py`), plus a SQLite chat history, so past conversations survive a restart
and the UI can list, reopen and delete them. It also records the Analytics Agent's work
(`work` events) for the UI's "Show work" section.

MCP server: https://github.com/thoughtspot/mcp-server
"""

import asyncio
import json
import os
import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx2
from fastapi import HTTPException
from pydantic import BaseModel

from spotter3_core import (
    TS_HOST,
    analytical_sessions,
    conversations,
    create_app,
    run_turn,
    server_token,
    sse_response,
)

app = create_app()

# ════════════════════════════════════════════════════════════════════════════════
# CHAT HISTORY
#
# Stored in two layers, because the browser and the model need different things:
#
#   turns           - what the UI renders: user text, assistant text, the answers
#                     (titles only, see `storable_answers`) and the Agent's work steps.
#   claude_messages - the raw Claude message list, tool_use and tool_result blocks
#                     included. Replayed into the next request so follow-ups keep full
#                     context after a restart.
#
# The ThoughtSpot MCP server's own conversation storage is internal plumbing for
# `get_session_updates` delivery, not a client-facing history API - so history belongs to
# the app. SQLite via the stdlib, no extra dependency. Calls are small and run in a worker
# thread (`asyncio.to_thread`) to keep the event loop free.
# ════════════════════════════════════════════════════════════════════════════════

DB_PATH = Path(os.getenv("CHAT_HISTORY_DB", Path(__file__).resolve().parent / "chat_history.db"))

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
    work            TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS turns_by_conversation ON turns (conversation_id, id);
"""

TITLE_MAX_LEN = 60


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """A connection that commits on success, rolls back on error and always closes."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # concurrent reads while a turn is written
    conn.execute("PRAGMA foreign_keys=ON")  # so deleting a conversation drops its turns
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def db_init() -> None:
    with db() as conn:
        conn.executescript(SCHEMA)
        # A database from before `work` existed is left untouched by CREATE IF NOT EXISTS.
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(turns)")}
        if "work" not in columns:
            conn.execute("ALTER TABLE turns ADD COLUMN work TEXT NOT NULL DEFAULT '[]'")
    print(f"[History] SQLite at {DB_PATH}")


db_init()


def jsonable(value: Any) -> Any:
    """Make a Claude message list JSON-serializable.

    Assistant turns hold SDK block objects. `model_dump` keeps every field the API needs
    on replay - including a thinking block's `signature`, which must come back unchanged.
    """
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        return dump(mode="json", exclude_none=True)
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    return value


def storable_answers(answers: list[dict]) -> list[dict]:
    """Keep the parts of an answer that survive, drop the parts that go stale.

    An answer object lives about 8 hours on the ThoughtSpot side. After that its
    `iframe_url` - and the `answer_id`, really a `{session_id, gen_no}` pair - point at
    nothing, and a reopened chat would render a row of error tiles. So only the durable
    parts are stored; on replay the client asks the Visual Embed SDK for a live URL from
    the conversation id plus the answer's position. `query` is dropped too: nothing reads
    it on replay.

    Applied on the way out as well, so rows stored before this rule resolve on replay too.
    """
    return [
        {k: v for k, v in answer.items() if k not in ("iframe_url", "answer_id", "query")}
        for answer in answers
    ]


def db_start_conversation(conv_id: str, first_message: str) -> None:
    """Create the conversation row if this is its first turn."""
    title = first_message.strip().splitlines()[0][:TITLE_MAX_LEN] or "New chat"
    stamp = now_iso()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (conv_id, title, stamp, stamp),
        )


def db_add_turn(
    conv_id: str, role: str, content: str, answers: list[dict], work: list[dict] | None = None
) -> None:
    stamp = now_iso()
    with db() as conn:
        conn.execute(
            "INSERT INTO turns (conversation_id, role, content, answers, work, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (conv_id, role, content, json.dumps(answers), json.dumps(work or []), stamp),
        )
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (stamp, conv_id))


def db_save_state(
    conv_id: str, claude_messages: list, analytical_session_id: str | None
) -> None:
    """Store the raw Claude history and ThoughtSpot session for the next turn."""
    with db() as conn:
        conn.execute(
            "UPDATE conversations SET claude_messages = ?, analytical_session_id = ?,"
            " updated_at = ? WHERE id = ?",
            (json.dumps(jsonable(claude_messages)), analytical_session_id, now_iso(), conv_id),
        )


def db_load_state(conv_id: str) -> tuple[list, str | None]:
    with db() as conn:
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
    with db() as conn:
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
    with db() as conn:
        row = conn.execute(
            "SELECT id, title, created_at, updated_at, analytical_session_id"
            " FROM conversations WHERE id = ?",
            (conv_id,),
        ).fetchone()
        if not row:
            return None
        turns = conn.execute(
            "SELECT role, content, answers, work, created_at FROM turns"
            " WHERE conversation_id = ? ORDER BY id",
            (conv_id,),
        ).fetchall()

    return {
        **dict(row),
        "turns": [
            {
                "role": turn["role"],
                "content": turn["content"],
                "answers": storable_answers(json.loads(turn["answers"] or "[]")),
                "work": json.loads(turn["work"] or "[]"),
                "created_at": turn["created_at"],
            }
            for turn in turns
        ],
    }


def db_get_session_id(conv_id: str) -> str | None:
    with db() as conn:
        row = conn.execute(
            "SELECT analytical_session_id FROM conversations WHERE id = ?", (conv_id,)
        ).fetchone()
    return row["analytical_session_id"] if row else None


def db_delete_conversation(conv_id: str) -> bool:
    with db() as conn:
        return conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,)).rowcount > 0


def db_rename_conversation(conv_id: str, title: str) -> bool:
    with db() as conn:
        updated = conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title.strip()[:TITLE_MAX_LEN] or "New chat", now_iso(), conv_id),
        ).rowcount
    return updated > 0


async def load_conversation_state(conv_id: str) -> list:
    """Claude message history for a conversation: from the in-memory cache, else SQLite
    (e.g. after a restart)."""
    if conv_id not in conversations:
        messages, session_id = await asyncio.to_thread(db_load_state, conv_id)
        conversations[conv_id] = messages
        if session_id:
            analytical_sessions[conv_id] = session_id
    return conversations[conv_id]


class StreamRecorder:
    """Fans every SSE event out to the browser and to the transcript we persist.

    The UI renders a turn from exactly the events it received, so recording them here is
    what makes a reopened conversation look like the live one.
    """

    def __init__(self, queue: asyncio.Queue) -> None:
        self.queue = queue
        self.text_parts: list[str] = []
        self.answers: list[dict] = []
        self.work: list[dict] = []  # the Analytics Agent's steps, for "Show work"

    def send(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "delta":
            self.text_parts.append(event.get("text") or "")
        elif kind == "answer":
            self.answers.append({k: event.get(k) for k in ("answer_id", "title", "iframe_url")})
        elif kind == "work":
            append_work(self.work, event)
        self.queue.put_nowait(event)

    @property
    def text(self) -> str:
        return "".join(self.text_parts)


def append_work(work: list[dict], event: dict) -> None:
    """Add one `work` event to a turn's work list, the way the client does.

    Reasoning prose streams a few words per event, so a `thought` continues the previous
    one instead of starting a new step. The client applies the same rule, which keeps the
    live and replayed views identical.
    """
    kind = event.get("kind")
    text = event.get("text") or ""
    if kind == "thought" and work and work[-1].get("kind") == "thought":
        work[-1]["text"] += text
        return
    step = {"kind": kind, "text": text}
    if event.get("query"):
        step["query"] = event["query"]
    work.append(step)


async def persist_turn(conv_id: str, recorder: StreamRecorder, history: list | None) -> None:
    """Store the assistant turn, and the state the next turn needs.

    Also runs when a turn fails or is cancelled: the user turn is already stored, so
    skipping this would leave a question with no visible answer on reopen.
    """
    if recorder.text or recorder.answers or recorder.work:
        await asyncio.to_thread(
            db_add_turn,
            conv_id,
            "assistant",
            recorder.text,
            storable_answers(recorder.answers),
            recorder.work,
        )
    if history is not None:
        await asyncio.to_thread(
            db_save_state, conv_id, history, analytical_sessions.get(conv_id)
        )


class ChatRequest(BaseModel):
    message: str
    response_id: str | None = None


class RenameRequest(BaseModel):
    title: str


@app.post("/api/chat")
async def chat(request: ChatRequest):
    conv_id = request.response_id or str(uuid.uuid4())
    print(f"[Chat] conv {conv_id}: {request.message}")

    history = await load_conversation_state(conv_id)
    messages = history + [{"role": "user", "content": request.message}]

    await asyncio.to_thread(db_start_conversation, conv_id, request.message)
    await asyncio.to_thread(db_add_turn, conv_id, "user", request.message, [])

    async def turn(queue: asyncio.Queue) -> None:
        recorder = StreamRecorder(queue)
        await run_turn(
            messages,
            conv_id,
            recorder.send,
            persist=lambda history: persist_turn(conv_id, recorder, history),
            show_work=True,
        )

    return sse_response(turn)


# ── ThoughtSpot conversation lookups ────────────────────────────────────────────
# A stored conversation is checked against what ThoughtSpot holds, so replayed charts
# line up with the answers the SDK resolves.


async def ts_request(
    method: str,
    path: str,
    label: str,
    read_timeout: float,
    headers: dict | None = None,
    json_body: dict | None = None,
) -> Any:
    """Call the ThoughtSpot REST API as the server user. Returns the JSON body, or None
    (logged) when the call fails."""
    try:
        async with httpx2.AsyncClient(timeout=httpx2.Timeout(10.0, read=read_timeout)) as client:
            response = await client.request(
                method,
                f"{TS_HOST.rstrip('/')}{path}",
                headers={
                    "Authorization": f"Bearer {await server_token()}",
                    "Accept": "application/json",
                    **(headers or {}),
                },
                json=json_body,
            )
        if response.status_code != 200:
            print(f"[History] {label} -> {response.status_code}")
            return None
        return response.json()
    except (httpx2.HTTPError, ValueError, TypeError, AttributeError) as exc:
        print(f"[History] {label} failed: {type(exc).__name__}: {exc}")
        return None


async def ts_conversation_messages(session_id: str) -> list[dict] | None:
    """A ThoughtSpot conversation's messages, oldest first, or None if unreadable."""
    body = await ts_request(
        "GET",
        f"/api/rest/2.0/ai/agent/conversations/{session_id}/messages",
        label=f"getConversation {session_id}",
        read_timeout=45.0,
    )
    if not isinstance(body, dict):
        return None
    messages = body.get("messages")
    return messages if isinstance(messages, list) else []


def answer_items(message: dict, thinking: bool) -> list[dict]:
    """A message's answer items that are (or are not) the Agent's thinking answers.

    Compared with `is` on purpose: an item missing `is_thinking` counts as neither. Items
    without an `answer_id` are skipped too. Both are the rules the Visual Embed SDK applies
    when it replays stored answers, so our counts match its indexes.
    """
    items = message.get("response_items") if isinstance(message, dict) else None
    return [
        item
        for item in (items or [])
        if isinstance(item, dict)
        and item.get("type") == "answer"
        and item.get("is_thinking") is thinking
        and item.get("answer_id")
    ]


async def ts_load_answer(session_id: str, answer_id: str) -> dict | None:
    """Live embed ids for one answer of a conversation, or None if it cannot load.

    The answer behind a stored URL expires after about 8 hours; loading it again through
    the conversation service gives fresh ids for the same answer. This is the call the
    Visual Embed SDK makes when it replays a stored answer.
    """
    body = await ts_request(
        "POST",
        f"/conversation/v2/{session_id}/message/{quote(answer_id, safe='')}/load/public",
        label=f"load answer {answer_id}",
        read_timeout=120.0,  # loading re-runs the query; 45s+ is common on a loaded cluster
        headers={"Content-Type": "application/json", "x-requested-by": "ThoughtSpot"},
        json_body={"type": "TS_ANSWER"},
    )
    if not isinstance(body, dict):
        return None

    answer = body.get("answer") or {}
    ac_state = answer.get("ac_state") or {}
    params = {
        "session_id": answer.get("session_identifier"),
        "gen_no": answer.get("generation_number"),
        "ac_session_id": ac_state.get("transaction_identifier"),
        "ac_gen_no": ac_state.get("generation_number"),
    }
    # All four are needed to build the embed route; a partial set renders an error.
    return params if all(params.values()) else None


def reconcile_answers(conversation: dict, ts_messages: list[dict] | None) -> dict:
    """Align a stored conversation with the answers ThoughtSpot actually holds.

    The stored copy is not a reliable source of truth. A stream can be cut off (the
    browser navigates away, the process restarts) after the Agent was already asked; it
    finishes anyway, so the answer exists on ThoughtSpot's side while our turn recorded
    none of it. And `answer_index` has to count the way ThoughtSpot counts, or a replayed
    answer resolves to the wrong chart.

    So ThoughtSpot decides how many answers each turn has and the stored rows only supply
    titles. A turn missing answers gets untitled placeholders; the client renders them and
    the SDK resolves each by its index.
    """
    turns = conversation.get("turns") or []
    if ts_messages is None:
        # ThoughtSpot unreachable: fall back to the stored shape rather than drop charts.
        index = 0
        for turn in turns:
            for answer in turn.get("answers") or []:
                answer["answer_index"] = index
                index += 1
        return conversation

    # One ThoughtSpot message per user prompt: pair them with the assistant turns in order.
    assistant_turns = [turn for turn in turns if turn.get("role") == "assistant"]
    index = 0
    for position, turn in enumerate(assistant_turns):
        message = ts_messages[position] if position < len(ts_messages) else {}
        expected = len(answer_items(message, thinking=False))
        # The thinking answers behind this turn's Show work queries, in step order. The
        # client loads one by id when its row is expanded.
        thinking_answers = answer_items(message, thinking=True)
        turn["work_answer_ids"] = [item["answer_id"] for item in thinking_answers]
        answers = turn.get("answers") or []
        # Titles we recorded, padded out to the count ThoughtSpot reports.
        merged = answers[:expected] + [{} for _ in range(max(0, expected - len(answers)))]
        for answer in merged:
            answer["answer_index"] = index
            index += 1
        turn["answers"] = merged
    return conversation


# ── Chat history endpoints ──────────────────────────────────────────────────────


@app.get("/api/conversations")
async def list_conversations():
    return {"conversations": await asyncio.to_thread(db_list_conversations)}


@app.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conversation = await asyncio.to_thread(db_get_conversation, conv_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    session_id = conversation.get("analytical_session_id")
    ts_messages = await ts_conversation_messages(session_id) if session_id else None
    return reconcile_answers(conversation, ts_messages)


@app.get("/api/conversations/{conv_id}/work-answers/{answer_id}")
async def get_work_answer(conv_id: str, answer_id: str):
    """Live embed ids for a thinking answer shown in a stored turn's Show work.

    `answer_id` comes from the turn's `work_answer_ids`. The client asks only when a step
    is expanded, so a reopened chat does not load every intermediate chart up front.
    ThoughtSpot checks the answer belongs to the conversation.
    """
    session_id = await asyncio.to_thread(db_get_session_id, conv_id)
    if not session_id:
        raise HTTPException(status_code=404, detail="Conversation has no ThoughtSpot session")

    frame_params = await ts_load_answer(session_id, answer_id)
    if not frame_params:
        raise HTTPException(status_code=502, detail="Could not load that answer")
    return {"frame_params": frame_params}


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
