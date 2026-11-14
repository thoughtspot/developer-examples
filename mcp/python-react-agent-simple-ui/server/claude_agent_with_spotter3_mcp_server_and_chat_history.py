"""
Python agent: Anthropic Claude + the ThoughtSpot MCP server (Spotter 3 toolset),
with saved chat history.

Same agent as `claude_agent_with_spotter3_mcp_server.py` (the agent itself lives in
`spotter3_core.py`). This version also saves every chat to a small SQLite file, so:

  - chats survive a server restart,
  - the UI can list, reopen, rename and delete past chats,
  - the Analytics Agent's steps are kept for the UI's "Show work" section.

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
    forget_conversation,
    trust_session,
    valid_session_id,
    run_turn,
    server_token,
    sse_response,
)

app = create_app()

# ════════════════════════════════════════════════════════════════════════════════
# CHAT HISTORY
#
# For the big picture, see "How chat history works" in the README.
#
# For each chat we save three things:
#
#   1. The messages       - every question and reply, so the chat can be shown again
#                           and the AI remembers the context for follow-up questions.
#   2. The conversation ids - ThoughtSpot's id for the session that produced each reply
#                           (`analytical_session_id`), kept on the reply and on each of
#                           its charts. ThoughtSpot keeps a session's charts under its id.
#                           Usually one chat has one session, but a session lives in the
#                           Org it was created in: after an Org switch the agent opens a
#                           new one, so one chat can span several.
#   3. A chart count      - one placeholder per chart in each reply, holding only the
#                           session id above.
#
# The screen's copy (`turns`) holds no chart links or titles. (`claude_messages` is the
# AI's own working copy and can still contain titles from ThoughtSpot's replies.) A chart
# link stops working after about 8 hours. When a chat is reopened, each chart is drawn
# fresh from its session id plus the chart's number in that session (`answer_index`).
# See `reconcile_answers`.
#
# Where it is stored: a SQLite file next to this script. SQLite comes with Python, so
# there is nothing extra to install.
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
    created_at      TEXT NOT NULL,
    -- The session this reply's charts and Show work came from (assistant turns only).
    analytical_session_id TEXT,
    -- How many messages this reply sent to that session; NULL on older rows (read as 1).
    ts_message_count INTEGER
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
        if "ts_message_count" not in columns:
            conn.execute("ALTER TABLE turns ADD COLUMN ts_message_count INTEGER")
        if "analytical_session_id" not in columns:
            conn.execute("ALTER TABLE turns ADD COLUMN analytical_session_id TEXT")
            # Older rows predate per-reply sessions. Pin each reply to the chat's session
            # as it stands now, once: the chat's session can change later, and a reply
            # must keep pointing at the session that produced it.
            conn.execute(
                "UPDATE turns SET analytical_session_id = ("
                " SELECT c.analytical_session_id FROM conversations c"
                " WHERE c.id = turns.conversation_id)"
                " WHERE role = 'assistant'"
            )
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
    """One placeholder per chart, holding only the session that produced it.

    A chart's `iframe_url` and `answer_id` stop working after about 8 hours, and its
    title is not needed to rebuild it. What is kept is the chart's session
    (`analytical_session_id`), which does not expire; its position in that session
    (`answer_index`) is worked out on reopen.

    Also applied when reading, so rows saved by older versions lose their stale fields.
    """
    placeholders = []
    for answer in answers:
        session_id = answer.get("analytical_session_id") if isinstance(answer, dict) else None
        placeholders.append(
            {"analytical_session_id": session_id} if isinstance(session_id, str) else {}
        )
    return placeholders


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
    conv_id: str,
    role: str,
    content: str,
    answers: list[dict],
    work: list[dict] | None = None,
    analytical_session_id: str | None = None,
    ts_message_count: int | None = None,
) -> None:
    stamp = now_iso()
    with db() as conn:
        conn.execute(
            "INSERT INTO turns (conversation_id, role, content, answers, work, created_at,"
            " analytical_session_id, ts_message_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                conv_id,
                role,
                content,
                json.dumps(storable_answers(answers)),
                json.dumps(work or []),
                stamp,
                analytical_session_id,
                ts_message_count,
            ),
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
            "SELECT role, content, answers, work, created_at, analytical_session_id,"
            " ts_message_count FROM turns"
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
                "analytical_session_id": turn["analytical_session_id"],
                "ts_message_count": turn["ts_message_count"],
            }
            for turn in turns
        ],
    }


def db_get_session_ids(conv_id: str) -> tuple[str | None, set[str]]:
    """The chat's current session, and every session any of its replies came from."""
    with db() as conn:
        row = conn.execute(
            "SELECT analytical_session_id FROM conversations WHERE id = ?", (conv_id,)
        ).fetchone()
        if not row:
            return None, set()
        used = conn.execute(
            "SELECT DISTINCT analytical_session_id FROM turns"
            " WHERE conversation_id = ? AND analytical_session_id IS NOT NULL",
            (conv_id,),
        ).fetchall()
    current = row["analytical_session_id"]
    sessions = {r["analytical_session_id"] for r in used}
    if current:
        sessions.add(current)
    return current, sessions


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
        if valid_session_id(session_id):
            analytical_sessions[conv_id] = session_id
        # The sessions this chat already used, so a follow-up's charts in them are tagged.
        _, known = await asyncio.to_thread(db_get_session_ids, conv_id)
        for known_session in known:
            trust_session(conv_id, known_session)
    return conversations[conv_id]


class StreamRecorder:
    """Sends each event to the browser and also keeps a copy to save.

    Saving what the browser received lets a reopened chat match the live one, except
    chart titles, which are not kept.
    """

    def __init__(self, queue: asyncio.Queue) -> None:
        self.queue = queue
        self.text_parts: list[str] = []
        self.answers: list[dict] = []
        self.work: list[dict] = []  # the Analytics Agent's steps, for "Show work"
        # The session this reply's charts and Show work queries came from.
        self.session_id: str | None = None

    def send(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "delta":
            self.text_parts.append(event.get("text") or "")
        elif kind == "answer":
            # One placeholder per chart, tagged with its session; see `storable_answers`.
            self.answers.append({"analytical_session_id": event.get("analytical_session_id")})
        elif kind == "work":
            append_work(self.work, event)
        if kind in ("answer", "work") and event.get("analytical_session_id"):
            self.session_id = event["analytical_session_id"]
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


def block_field(block: Any, name: str) -> Any:
    """A field of a Claude content block, which is an SDK object or (once stored) a dict."""
    return block.get(name) if isinstance(block, dict) else getattr(block, name, None)


def session_message_count(turn_messages: list, session_id: str | None) -> int:
    """How many questions this reply sent to `session_id` that ThoughtSpot accepted.

    ThoughtSpot stores one message per accepted `send_session_message`, and a reply can
    send more than one (the agent retries, or asks two questions) or none (a greeting).
    `reconcile_answers` pairs replies with messages, so it needs the real count, not an
    assumed one.
    """
    if not session_id:
        return 0  # no session yet, so nothing was sent
    sent: set[str] = set()
    for message in turn_messages:
        if message.get("role") != "assistant" or not isinstance(message.get("content"), list):
            continue
        for block in message["content"]:
            arguments = block_field(block, "input") or {}
            if (
                block_field(block, "type") == "tool_use"
                and block_field(block, "name") == "send_session_message"
                and isinstance(arguments, dict)
                and arguments.get("analytical_session_id") == session_id
            ):
                sent.add(block_field(block, "id"))
    accepted = 0
    for message in turn_messages:
        if message.get("role") != "user" or not isinstance(message.get("content"), list):
            continue
        for block in message["content"]:
            if (
                isinstance(block, dict)
                and block.get("type") == "tool_result"
                and block.get("tool_use_id") in sent
                and not block.get("is_error")
            ):
                accepted += 1
    return accepted


async def persist_turn(
    conv_id: str, recorder: StreamRecorder, history: list | None, turn_start: int
) -> None:
    """Store the assistant turn, and the state the next turn needs.

    `turn_start` is where this turn begins in `history`, so its own tool calls can be told
    apart from earlier ones. Also runs when a turn fails or is cancelled: the user turn is
    already stored, so skipping this would leave a question with no visible answer on
    reopen.
    """
    if recorder.text or recorder.answers or recorder.work:
        # A reply with no chart or query may still have asked a session; if so, it was the
        # chat's current one, since the model updates that id whenever it opens a new
        # session. Whether it asked at all is in `message_count` (0 for a greeting).
        session_id = recorder.session_id or analytical_sessions.get(conv_id)
        # Unknown when the turn failed before a history came back; read as 1 on reopen.
        message_count = (
            session_message_count(history[turn_start:], session_id)
            if history is not None and len(history) > turn_start
            else None
        )
        await asyncio.to_thread(
            db_add_turn,
            conv_id,
            "assistant",
            recorder.text,
            recorder.answers,
            recorder.work,
            session_id,
            message_count,
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
            persist=lambda history: persist_turn(conv_id, recorder, history, len(messages)),
            show_work=True,
        )

    return sse_response(turn)


# ── ThoughtSpot conversation lookups ────────────────────────────────────────────
# On reopen, the saved chat is checked against the conversation ThoughtSpot holds, so
# each chart gets the right `answer_index`.


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
        f"/api/rest/2.0/ai/agent/conversations/{quote(session_id, safe='')}/messages",
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
        f"/conversation/v2/{quote(session_id, safe='')}/message/{quote(answer_id, safe='')}"
        "/load/public",
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


def reply_session(turn: dict, conversation: dict) -> str | None:
    """The session a stored reply came from. Rows saved before replies kept their own
    session fall back to the chat's."""
    return turn.get("analytical_session_id") or conversation.get("analytical_session_id")


def reconcile_answers(
    conversation: dict, ts_messages_by_session: dict[str, list[dict] | None]
) -> dict:
    """Give every saved chart its session and its number in that session (`answer_index`).

    Think of a session's charts as numbered pages in a notebook. ThoughtSpot keeps the
    notebook (the session id); we only need each chart's page number. The first final
    chart in a session is 0, the next is 1, and so on. The browser hands both to the
    Visual Embed SDK (`tsmcpConversationId`, `tsmcpAnswerIndex`), and ThoughtSpot draws
    the chart fresh.

    One chat can fill more than one notebook. A session belongs to the Org it was
    created in; after an Org switch the agent opens a new one and later charts go
    there. So replies are grouped by their session and numbered within it - a chart
    numbered across the whole chat would point into the wrong notebook.

    We let ThoughtSpot do the counting, not our saved copy. If the browser closes while a
    chart is loading, ThoughtSpot still finishes the chart but we never saw it. Its count
    is complete; ours may not be. A chart we missed gets an empty placeholder.

    How to find a chart's number from its link (`iframe_url`)
    ----------------------------------------------------------
    A chart link from the MCP server looks like this:

        https://<host>/?tsmcp=true#/embed/conv-assist-answer
            ?sessionId=72728061-...&genNo=2&acSessionId=2bfd6f50-...&acGenNo=1

    1. From the link, note `sessionId` and `genNo`. Together they name one chart.
    2. Get the session's messages from ThoughtSpot:
       GET /api/rest/2.0/ai/agent/conversations/{analytical_session_id}/messages
    3. Go through the messages oldest first. Count only final charts: items in
       `response_items` with `type == "answer"`, `is_thinking == false` and an
       `answer_id`. Skip the "thinking" charts (see `answer_items`).
    4. Number those charts 0, 1, 2, ... across the whole session.
    5. `answer_id` is text holding JSON, like {"session_id": "...", "gen_no": 2}.
       Parse it. The chart with the same `session_id` and `gen_no` as step 1 has your
       number: that is its `answer_index`.

    This function does steps 2 to 4 for every chart at once, turn by turn.
    `ts_messages_by_session` holds each session's messages, or None when ThoughtSpot
    would not return them - for example, the session belongs to another Org. Those
    replies keep their saved charts, numbered in saved order, so the SDK can still try
    them and show its notice if they cannot load.
    """
    turns = conversation.get("turns") or []

    # ThoughtSpot stores one message per question a reply sent to its session: pair each
    # session's messages with that session's replies, in order (`ts_message_count`).
    replies_by_session: dict[str | None, list[dict]] = {}
    for turn in turns:
        if turn.get("role") == "assistant":
            replies_by_session.setdefault(reply_session(turn, conversation), []).append(turn)

    for session_id, replies in replies_by_session.items():
        ts_messages = ts_messages_by_session.get(session_id) if session_id else None
        index = 0
        position = 0
        for turn in replies:
            answers = turn.get("answers") or []
            # How many of the session's messages this reply sent: the agent can retry
            # or ask twice in one reply. Older rows did not record it; read them as 1.
            count = turn.get("ts_message_count")
            count = 1 if count is None else count
            own = (ts_messages or [])[position : position + count]
            position += count
            if ts_messages is None:
                # Unreadable: fall back to the stored shape rather than drop charts.
                merged = answers
            else:
                expected = sum(len(answer_items(m, thinking=False)) for m in own)
                # The thinking answers behind this turn's Show work queries, in step
                # order. The client loads one by id when its row is expanded.
                thinking_answers = [a for m in own for a in answer_items(m, thinking=True)]
                turn["work_answer_ids"] = [item["answer_id"] for item in thinking_answers]
                # Saved placeholders, padded out to the count ThoughtSpot reports.
                merged = answers[:expected] + [
                    {} for _ in range(max(0, expected - len(answers)))
                ]
            for answer in merged:
                answer["analytical_session_id"] = session_id
                answer["answer_index"] = index
                index += 1
            turn["answers"] = merged
            turn["analytical_session_id"] = session_id
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

    # Each session the chat's replies came from, read once and in parallel.
    session_ids = list(
        dict.fromkeys(
            session_id
            for turn in conversation["turns"]
            if turn["role"] == "assistant"
            and (session_id := reply_session(turn, conversation))
        )
    )
    messages = await asyncio.gather(*(ts_conversation_messages(s) for s in session_ids))
    return reconcile_answers(conversation, dict(zip(session_ids, messages)))


@app.get("/api/conversations/{conv_id}/work-answers/{answer_id}")
async def get_work_answer(conv_id: str, answer_id: str, session_id: str | None = None):
    """Live embed ids for a thinking answer shown in a stored turn's Show work.

    `answer_id` comes from the turn's `work_answer_ids`, and `session_id` from the turn
    (`analytical_session_id`), since a chat can span sessions. The client asks only when a
    step is expanded, so a reopened chat does not load every intermediate chart up front.
    The session must be one this chat used, and ThoughtSpot checks the answer belongs to it.
    """
    current, known = await asyncio.to_thread(db_get_session_ids, conv_id)
    if session_id is None:
        session_id = current
    if not session_id:
        raise HTTPException(status_code=404, detail="Conversation has no ThoughtSpot session")
    if not valid_session_id(session_id) or session_id not in known:
        raise HTTPException(status_code=404, detail="Session not part of this conversation")

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
    forget_conversation(conv_id)
    return {"status": "deleted"}
