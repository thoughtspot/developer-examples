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
import re
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
# For the big picture, see "How chat history works" in the README.
#
# For each chat we save:
#
#   1. The messages        - every question and reply, so the chat can be shown again
#                            and the AI remembers the context for follow-up questions.
#   2. The conversation id - ThoughtSpot's id for the chat (`analytical_session_id`).
#                            ThoughtSpot keeps the chat's charts under this id.
#   3. The charts, as HTML - each reply is saved as one string: Claude's text with a
#                            link (`<a>`) for each chart, where Claude wrote its label
#                            (or at the end). See `place_charts`. The browser turns
#                            each link into the chart's `<iframe>`.
#                            Where the chart's address would go, the HTML holds a
#                            placeholder with the chart's number in the chat, like
#                            {{TS_CHART:3}}. See `chart_tag`.
#
# Chart links are not saved: they stop working after about 8 hours. When a chat is
# reopened, each placeholder becomes a fresh link built from the conversation id and the
# chart's number, and ThoughtSpot draws the chart again. See `fill_chart_links`.
#
# (`claude_messages` is the AI's own working copy and can still hold chart titles from
# ThoughtSpot's replies.)
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
        migrate_iframe_tags(conn)
        migrate_legacy_charts(conn, columns)
    print(f"[History] SQLite at {DB_PATH}")


def migrate_iframe_tags(conn: sqlite3.Connection) -> None:
    """Turn chart `<iframe>` tags saved by an earlier version of this example into the
    chart links (`chart_tag`) used now. Runs once: afterwards nothing matches."""
    rows = conn.execute(
        "SELECT id, content FROM turns WHERE role = 'assistant' AND content LIKE ?",
        ("%<iframe data-ts-chart src=%",),
    ).fetchall()
    for row in rows:
        content = OLD_CHART_IFRAME.sub(
            lambda match: chart_tag(int(match[1])).strip(), row["content"]
        )
        conn.execute("UPDATE turns SET content = ? WHERE id = ?", (content, row["id"]))


def migrate_legacy_charts(conn: sqlite3.Connection, columns: set[str]) -> None:
    """Move charts saved by older versions of this example into the reply text.

    Older versions kept a reply's charts apart from its text: as a list in an `answers`
    column, or as HTML in a `charts_html` column. They are moved to the start of the
    reply - where those versions showed them - as `chart_tag`s, and every chart in the
    conversation is numbered again in order, so new replies count them too.

    Runs once: the old columns are emptied afterwards (they stay, unused).
    """
    legacy = [name for name in ("answers", "charts_html") if name in columns]
    if not legacy:
        return
    pending = " OR ".join(
        "answers NOT IN ('', '[]')" if name == "answers" else "charts_html != ''"
        for name in legacy
    )
    conversation_ids = [
        row[0]
        for row in conn.execute(
            f"SELECT DISTINCT conversation_id FROM turns WHERE role = 'assistant' AND ({pending})"
        )
    ]
    for conv_id in conversation_ids:
        number = 0
        rows = conn.execute(
            f"SELECT id, content, {', '.join(legacy)} FROM turns"
            " WHERE conversation_id = ? AND role = 'assistant' ORDER BY id",
            (conv_id,),
        ).fetchall()
        for row in rows:
            old_charts = 0
            if "answers" in legacy:
                try:
                    parsed = json.loads(row["answers"] or "[]")
                except ValueError:
                    parsed = []
                if isinstance(parsed, list):
                    old_charts += len(parsed)
            if "charts_html" in legacy:
                old_charts += (row["charts_html"] or "").count("{{TS_CHART:")
            moved = "".join(chart_tag(number + i) for i in range(old_charts))
            number += old_charts

            def renumber(match: re.Match) -> str:
                nonlocal number
                number += 1
                return chart_tag(number - 1).strip()

            content = (moved + CHART_TAG.sub(renumber, row["content"])).lstrip("\n")
            empty = ", ".join(f"{name} = ?" for name in legacy)
            conn.execute(
                f"UPDATE turns SET content = ?, {empty} WHERE id = ?",
                (content, *[("[]" if name == "answers" else "") for name in legacy], row["id"]),
            )


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


# A chart inside a saved reply: a plain link, which the browser turns into the chart's
# `<iframe>`. A link travels from server to browser more easily than an `<iframe>` -
# many HTML cleaners, markdown renderers and proxies drop or block iframes. And if
# nothing converts it, a reader still gets a working link instead of a broken frame.
# `data-ts-chart` marks the links this app wrote, so a link in Claude's own text is
# never mistaken for one.
CHART_TAG = re.compile(r'<a data-ts-chart href="\{\{TS_CHART:(\d+)\}\}">ThoughtSpot chart</a>')
# The `<iframe>` form an earlier version of this example saved. See `migrate_iframe_tags`.
OLD_CHART_IFRAME = re.compile(r'<iframe data-ts-chart src="\{\{TS_CHART:(\d+)\}\}"></iframe>')


def chart_tag(number: int) -> str:
    """The HTML saved for one chart: a link with a placeholder where the address goes.

    Charts are numbered across the whole chat, from 0: if earlier replies had 3 charts,
    this reply's charts are 3, 4, ... That number (`answer_index`) is how ThoughtSpot
    finds the chart again. It counts the same way: the final charts of every reply, in
    order, skipping the Agent's "thinking" charts - which never reach a reply.

    Blank lines around the tag keep the text on either side as separate paragraphs.
    """
    return f'\n\n<a data-ts-chart href="{{{{TS_CHART:{number}}}}}">ThoughtSpot chart</a>\n\n'


def fill_chart_links(html: str, session_id: str | None) -> str:
    """Swap each placeholder for the chart's address. The browser turns the link into an
    `<iframe>`, and the Visual Embed SDK turns that into a live chart.

    The address carries the conversation id and the chart's number. Without a
    conversation id there is nothing to rebuild a chart from, so the charts are left out.
    """
    if not session_id:
        return CHART_TAG.sub("", html)
    link = (
        f"{TS_HOST.rstrip('/')}/v2/?tsmcp=true"
        f"&amp;tsmcpConversationId={quote(session_id, safe='')}&amp;tsmcpAnswerIndex="
    )
    return CHART_TAG.sub(
        lambda match: f'<a data-ts-chart href="{link}{match[1]}">ThoughtSpot chart</a>', html
    )


# After the chart helpers: moving older charts into replies uses them.
db_init()


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


def db_add_turn(conv_id: str, role: str, content: str, work: list[dict] | None = None) -> None:
    stamp = now_iso()
    with db() as conn:
        if role == "assistant":
            # The reply numbers its charts from 0. Shift them to follow every chart
            # already saved for the chat.
            earlier = conn.execute(
                "SELECT content FROM turns WHERE conversation_id = ? AND role = 'assistant'",
                (conv_id,),
            ).fetchall()
            first = sum(len(CHART_TAG.findall(row["content"])) for row in earlier)
            content = CHART_TAG.sub(lambda match: chart_tag(first + int(match[1])).strip(), content)
        conn.execute(
            "INSERT INTO turns (conversation_id, role, content, work, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (conv_id, role, content, json.dumps(work or []), stamp),
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
            "SELECT role, content, work, created_at FROM turns"
            " WHERE conversation_id = ? ORDER BY id",
            (conv_id,),
        ).fetchall()

    return {
        **dict(row),
        "turns": [
            {
                "role": turn["role"],
                "content": (
                    fill_chart_links(turn["content"], row["analytical_session_id"])
                    if turn["role"] == "assistant"
                    else turn["content"]
                ),
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


# Where Claude wants a chart: its label in square brackets, e.g. [chart-1] (see the
# system prompt in spotter3_core).
CHART_LABEL = re.compile(r"\[(chart-\d+)\]")


def place_charts(text: str, labels: list[str]) -> str:
    """Claude's text with each chart where Claude put its label.

    `labels` are the reply's charts in the order they arrived - which is also their
    number in the chat. A label used twice, or for a chart that does not exist, is
    dropped. A chart Claude did not place goes at the end, so none is lost.

    Claude's text can be steered by the data it reads, so it must never produce a chart
    tag of its own. The steps run in an order that rules that out: labels first become
    neutral markers, then any `data-ts-chart` in the text is defused, and only then are
    the real chart tags put in. (Removing a dropped label after defusing could join two
    halves of text into a working tag, so a dropped label leaves a zero-width space.)

    The browser does the same while the reply streams in (`placeCharts` in App.tsx), so
    the live and reopened views match.
    """
    number = {label: i for i, label in enumerate(labels)}
    placed: set[str] = set()

    def put(match: re.Match) -> str:
        label = match[1]
        if label not in number or label in placed:
            # An invisible space, not nothing: removing the label outright could join
            # the text on either side into a working `data-ts-chart` tag.
            return "\u200b"
        placed.add(label)
        return chart_tag(number[label])

    text = text.replace("\x00", "")
    text = CHART_LABEL.sub(lambda match: f"\x00{match[1]}\x00", text)
    text = text.replace("data-ts-chart", "data-ts-chart-text")
    text = re.sub(r"\x00(chart-\d+)\x00", put, text)
    return text + "".join(chart_tag(number[label]) for label in labels if label not in placed)


class StreamRecorder:
    """Sends each event to the browser and also keeps a copy to save.

    The copy is one string: Claude's text, with each chart where Claude put its label
    (`place_charts`). So a reopened chat matches the live one.
    """

    def __init__(self, queue: asyncio.Queue) -> None:
        self.queue = queue
        self.text_parts: list[str] = []
        # The reply's chart labels, in the order the charts arrived. Repeats never get
        # here: spotter3_core drops them before sending.
        self.charts: list[str] = []
        self.work: list[dict] = []  # the Analytics Agent's steps, for "Show work"

    def send(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "delta":
            self.text_parts.append(event.get("text") or "")
        elif kind == "answer" and event.get("chart"):
            # A chart can be sent twice: again when its link arrives late.
            if event["chart"] not in self.charts:
                self.charts.append(event["chart"])
        elif kind == "work":
            append_work(self.work, event)
        elif kind == "error":
            # Saved as the browser shows it, after what already arrived.
            self.text_parts.append(f"\n\nError: {event.get('message') or ''}")
        self.queue.put_nowait(event)

    @property
    def text(self) -> str:
        """The reply as saved: Claude's text with the charts placed (`place_charts`)."""
        return place_charts("".join(self.text_parts), self.charts)


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
    if recorder.text_parts or recorder.charts or recorder.work:
        await asyncio.to_thread(db_add_turn, conv_id, "assistant", recorder.text, recorder.work)
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
    await asyncio.to_thread(db_add_turn, conv_id, "user", request.message)

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
# Only "Show work" needs these: its intermediate charts are found by ThoughtSpot's own
# ids, which are read from the conversation when a chat is reopened.


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


def thinking_answer_ids(message: dict) -> list[str]:
    """The ids of a message's "thinking" charts - the Agent's attempts before its final
    answer, shown under Show work - in the order they were made."""
    items = message.get("response_items") if isinstance(message, dict) else None
    return [
        item["answer_id"]
        for item in (items or [])
        if isinstance(item, dict)
        and item.get("type") == "answer"
        and item.get("is_thinking") is True
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


def attach_work_answer_ids(conversation: dict, ts_messages: list[dict]) -> None:
    """Give each reply the ids of its Show work charts.

    ThoughtSpot holds one message per question, in order, so they pair with the
    replies by position.
    """
    replies = [turn for turn in conversation["turns"] if turn["role"] == "assistant"]
    for reply, message in zip(replies, ts_messages):
        reply["work_answer_ids"] = thinking_answer_ids(message)


# ── Chat history endpoints ──────────────────────────────────────────────────────


@app.get("/api/conversations")
async def list_conversations():
    return {"conversations": await asyncio.to_thread(db_list_conversations)}


@app.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    conversation = await asyncio.to_thread(db_get_conversation, conv_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Ask ThoughtSpot only when a reply has Show work charts to find.
    session_id = conversation.get("analytical_session_id")
    has_work_charts = any(
        step.get("kind") == "query" for turn in conversation["turns"] for step in turn["work"]
    )
    if session_id and has_work_charts:
        ts_messages = await ts_conversation_messages(session_id)
        if ts_messages:
            attach_work_answer_ids(conversation, ts_messages)
    return conversation


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
