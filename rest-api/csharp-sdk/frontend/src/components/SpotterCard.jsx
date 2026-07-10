import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { renderMarkdown } from "../markdown.jsx";
import { SearchIcon } from "../icons.jsx";

// Some "thinking" chunks echo raw tool output (dataset schemas, JSON blobs)
// that can run to several KB — fine for a backend log, unreadable as a
// single trace line. Clip it so the trace stays scannable.
const TRACE_CHAR_LIMIT = 160;
const clipTrace = (text) =>
  text.length > TRACE_CHAR_LIMIT ? `${text.slice(0, TRACE_CHAR_LIMIT).trim()}…` : text;

// One row of the muted trace above the answer — tool calls and the model's
// "thinking" chunks, so the user can see what Spotter is doing while it works.
function TraceItem({ event }) {
  if (event.type === "notification") {
    return (
      <div className="trace-item">
        <span className="trace-dot" />
        {event.metadata?.tool_title ?? event.code}
      </div>
    );
  }
  if (event.type === "text-chunk" || event.type === "text") {
    return (
      <div className="trace-item">
        <span className="trace-dot" />
        {clipTrace(event.content)}
      </div>
    );
  }
  return null;
}

function Exchange({ entry }) {
  const isAnswering = entry.streaming && entry.answer.length > 0;
  const isThinking = entry.streaming && entry.answer.length === 0;

  return (
    <div className="exchange">
      <div className="msg-user-row">
        <div className="msg-user">{entry.query}</div>
      </div>
      <div className="msg-assistant-row">
        <div className="assistant-avatar">✨</div>
        <div className="msg-assistant">
          {entry.events.length > 0 && (
            <div className="trace">
              {entry.events.map((evt, i) => <TraceItem key={i} event={evt} />)}
            </div>
          )}

          {isThinking && (
            <div className="answer-bubble">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          )}

          {entry.answer && (
            <div className="answer-bubble">
              {renderMarkdown(entry.answer)}
              {isAnswering && <span className="cursor" />}
            </div>
          )}

          {entry.error && <p className="error-banner">{entry.error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SpotterCard() {
  const [query, setQuery] = useState("total sales by product type");
  const [history, setHistory] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const stopRef = useRef(null);
  const bottomRef = useRef(null);

  // Close any open stream if the user navigates away mid-answer.
  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history]);

  const ask = (e) => {
    e.preventDefault();
    stopRef.current?.();

    const id = `${Date.now()}-${history.length}`;
    const askedQuery = query;
    setHistory((h) => [...h, { id, query: askedQuery, events: [], answer: "", streaming: true, error: null }]);
    setStreaming(true);

    const update = (patch) =>
      setHistory((h) => h.map((entry) => (entry.id === id ? { ...entry, ...patch(entry) } : entry)));

    stopRef.current = api.streamSpotter(askedQuery, {
      onEvent: (evt) => {
        const isThinking = evt.metadata?.type === "thinking";
        const isAnswerChunk = (evt.type === "text-chunk" || evt.type === "text") && !isThinking;
        update((entry) =>
          isAnswerChunk
            ? { answer: entry.answer + evt.content }
            : { events: [...entry.events, evt] }
        );
      },
      onError: (message) => {
        update(() => ({ error: message, streaming: false }));
        setStreaming(false);
      },
      onDone: () => {
        update(() => ({ streaming: false }));
        setStreaming(false);
      },
    });
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon">✨</div>
        <div>
          <h2 className="card-title">Ask Spotter</h2>
          <p className="card-desc">
            Streams a Spotter agent conversation live via Server-Sent Events, against the
            worksheet configured via <code>VITE_SPOTTER_WORKSHEET_ID</code>.
          </p>
        </div>
      </div>

      <div className="card-body">
        {history.length === 0 && <p className="chat-empty">Ask a question about your data to get started.</p>}

        {history.length > 0 && (
          <div className="chat">
            {history.map((entry) => <Exchange key={entry.id} entry={entry} />)}
            <div ref={bottomRef} />
          </div>
        )}

        <form className="field-row" style={{ marginTop: 16 }} onSubmit={ask}>
          <div className="input-wrap">
            <span className="input-icon"><SearchIcon /></span>
            <input
              className="input"
              placeholder="Ask a question about your data"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={streaming}>
            {streaming ? "Thinking…" : "Ask"}
          </button>
        </form>
      </div>
    </section>
  );
}
