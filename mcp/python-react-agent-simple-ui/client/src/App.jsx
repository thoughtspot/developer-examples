import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  init,
  AuthType,
  startAutoMCPFrameRenderer,
} from "@thoughtspot/visual-embed-sdk";

const API_URL = "/api/chat";
const HISTORY_URL = "/api/conversations";
const TOKEN_URL = "/api/ts-token";

// The embed renders inside ThoughtSpot's own iframe, so our CSS cannot reach it - it
// only follows the `--ts-var-*` variables handed to init(). Read the system theme once
// here and pass a matching palette. Keep these in step with App.css's dark tokens.
const prefersDark =
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const DARK_SURFACE = "#171a21";
const DARK_TEXT = "#e8eaed";
const DARK_TEXT_MUTED = "#9aa0a6";
const DARK_BORDER = "#2a2f3a";

const embedDarkVariables = {
  "--ts-var-root-background": DARK_SURFACE,
  "--ts-var-root-color": DARK_TEXT,
  "--ts-var-viz-background": DARK_SURFACE,
  "--ts-var-viz-title-color": DARK_TEXT,
  "--ts-var-viz-description-color": DARK_TEXT_MUTED,
  "--ts-var-menu-background": DARK_SURFACE,
  "--ts-var-menu-color": DARK_TEXT,
  "--ts-var-menu--hover-background": DARK_BORDER,
  "--ts-var-nav-background": DARK_SURFACE,
  "--ts-var-nav-color": DARK_TEXT,
  // Spotter / conversational-answer surfaces.
  "--ts-var-spotter-input-background": DARK_SURFACE,
  "--ts-var-spotter-prompt-background": DARK_BORDER,
  "--ts-var-spotterviz-panel-background": DARK_SURFACE,
  "--ts-var-spotterviz-message-background": DARK_SURFACE,
  "--ts-var-spotterviz-input-background": DARK_SURFACE,
  "--ts-var-spotterviz-text-primary": DARK_TEXT,
  "--ts-var-spotterviz-text-secondary": DARK_TEXT_MUTED,
  "--ts-var-spotterviz-border-color": DARK_BORDER,
};

// The conversational-answer content wrapper paints its own white background, and no
// `--ts-var-*` covers it - so its padding stays a white frame around a dark chart. Only
// a raw selector reaches it. The class is a CSS module, so the runtime name carries a
// hash suffix: match on substring, not equality.
//
// KNOWN INERT on champagne-master-aws.thoughtspotstaging.cloud (cluster 26.8): no
// customCSS reaches these frames there - neither `variables` nor `rules_UNSTABLE`,
// whether passed to init() or to startAutoMCPFrameRenderer. Verified with probe colors
// on a light-mode browser: the embed rendered fully default. CSP `style-src` allows
// `unsafe-inline`, so the block is upstream - most likely the CSS customization
// framework not being enabled for the org (Develop > Customizations). Left in place
// because it is correct per the SDK docs and starts working once that is enabled.
//
// rules_UNSTABLE is exactly that - unstable. These selectors are internal ThoughtSpot
// class names and can change on a cluster upgrade, at which point the padding goes white
// again and the selector below needs re-checking against the DOM.
const embedDarkRules = {
  '[class*="convAssistAnswerContentContainer"]': {
    background: `${DARK_SURFACE} !important`,
    color: `${DARK_TEXT} !important`,
  },
};

// Spread into both init() and the auto-frame renderer - empty under a light system
// theme, so ThoughtSpot's own default styling applies untouched.
const embedTheme = prefersDark
  ? {
      customizations: {
        style: {
          customCSS: {
            variables: embedDarkVariables,
            rules_UNSTABLE: embedDarkRules,
          },
        },
      },
    }
  : {};

init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.TrustedAuthTokenCookieless,
  // The SDK requires a NEW token from every call - returning one constant trips its
  // duplicate-token check as soon as that token stops verifying, with no way back.
  // The backend mints a fresh short-lived token per request; no token in the bundle.
  getAuthToken: async () => {
    const response = await fetch(TOKEN_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
    const { token } = await response.json();
    return token;
  },
  // Fetch a replacement before the current token expires, so the embed never lands
  // in a signed-out state mid-session.
  autoLogin: true,
  ...embedTheme,
  // Customize the style of the ThoughtSpot embed
  // The example below will make secondary buttons square and yellow
  // As well as make the menu background yellow and the menu item hover background yellow

  // customizations: {
  //   style: {
  //     customCSS: {
  //       variables: {
  //         "--ts-var-button-border-radius": "10px",
  //         "--ts-var-button--icon-border-radius": "10px",
  //         "--ts-var-button--secondary-background": "#FDE9AF",
  //         "--ts-var-button--secondary--hover-background": "#FCD977",
  //         "--ts-var-button--secondary--active-background": "#FCC838",
  //         "--ts-var-menu-background": "#FDE9AF",
  //         "--ts-var-menu--hover-background": "#FCD977",
  //       },
  //     },
  //   },
  // },
});

// Watches the DOM for iframes whose src carries `tsmcp=true` - the marker the
// ThoughtSpot MCP server adds to every `iframe_url` - and replaces each one in place
// with a fully configured, authenticated ThoughtSpot embed. This is what lets the
// server hand us a bare URL and still get a real interactive chart.
startAutoMCPFrameRenderer({
  frameParams: {
    height: "600px",
  },
  // The renderer builds its own embed with this view config; the customizations passed
  // to init() do not reach it, so the theme has to be repeated here.
  ...embedTheme,
});

const escapeAttr = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * The `src` to hand the auto-frame renderer for one answer.
 *
 * A live answer carries the `iframe_url` the MCP server just produced. A stored
 * one does not: those URLs embed a session that expires in about 8 hours, so the
 * server never persists them. Instead we point the renderer at the conversation
 * and the answer's position in it, and it resolves a current URL - re-running the
 * chart against today's data, which is why it also gets the stale-data notice.
 */
const answerSrc = (answer, conversationSessionId) => {
  // Digested MCP updates carry a ready-made URL.
  if (answer.iframe_url) return answer.iframe_url;

  const url = new URL("/v2/", import.meta.env.VITE_TS_HOST);
  url.searchParams.set("tsmcp", "true");

  // Raw MCP updates carry the ids instead, so we assemble the embed route here.
  const p = answer.frame_params;
  if (p?.session_id) {
    const hash = new URLSearchParams({
      sessionId: p.session_id,
      genNo: String(p.gen_no),
      acSessionId: p.ac_session_id,
      acGenNo: String(p.ac_gen_no),
    });
    return `${url.toString()}#/embed/conv-assist-answer?${hash.toString()}`;
  }

  // A stored answer has neither - the SDK resolves it from the conversation.
  if (!conversationSessionId || answer.answer_index == null) return null;
  url.searchParams.set("tsmcpConversationId", conversationSessionId);
  url.searchParams.set("tsmcpAnswerIndex", String(answer.answer_index));
  return url.toString();
};

/**
 * Markup for one MCP answer iframe.
 *
 * startAutoMCPFrameRenderer swaps the iframe element via replaceWith(), so React must
 * not own that node. Injecting the markup with dangerouslySetInnerHTML leaves React
 * owning only the wrapper, and the renderer's DOM observer upgrades the iframe in place.
 */
const answerHtml = (answer, conversationSessionId) => {
  const src = answerSrc(answer, conversationSessionId);
  if (!src) return "";
  return `<iframe src="${escapeAttr(src)}" title="${escapeAttr(
    answer.title || "ThoughtSpot answer",
  )}" style="width:100%;border:none"></iframe>`;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [responseId, setResponseId] = useState(null);
  // ThoughtSpot analytical session for the open conversation. Only a reopened
  // chat needs it - live answers arrive with a URL already attached.
  const [sessionId, setSessionId] = useState(null);
  // Chat history. `historyAvailable` stays false against a backend without the
  // /api/conversations endpoints, and the sidebar simply isn't rendered.
  const [conversations, setConversations] = useState([]);
  const [historyAvailable, setHistoryAvailable] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch(HISTORY_URL);
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setConversations(data.conversations || []);
      setHistoryAvailable(true);
    } catch {
      setHistoryAvailable(false);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Reopen a stored conversation. Stored turns carry their answers, so the charts
  // come back as embeds rather than as text - resolved live, since the stored
  // answers deliberately carry no URL. See answerSrc.
  const openConversation = useCallback(
    async (id) => {
      if (isLoading) return;
      try {
        const response = await fetch(`${HISTORY_URL}/${id}`);
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        setMessages(
          (data.turns || []).map((turn) => ({
            role: turn.role,
            content: turn.content,
            answers: turn.answers || [],
          })),
        );
        setResponseId(data.id);
        setSessionId(data.analytical_session_id || null);
        setStatus("");
      } catch (error) {
        setStatus(`Could not open that conversation: ${error.message}`);
      }
    },
    [isLoading],
  );

  const deleteConversation = useCallback(
    async (id, event) => {
      event.stopPropagation();
      await fetch(`${HISTORY_URL}/${id}`, { method: "DELETE" });
      if (id === responseId) {
        setMessages([]);
        setResponseId(null);
      }
      refreshConversations();
    },
    [responseId, refreshConversations],
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setStatus("Thinking...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", answers: [] },
    ]);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          response_id: responseId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "delta":
                setStatus("");
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.text,
                  };
                  return updated;
                });
                break;
              case "status":
                setStatus(data.message);
                break;
              // An answer the Analytics Agent produced. The server streams these as
              // soon as they arrive, so charts appear while the agent is still working.
              case "answer": {
                // Raw MCP updates have no `iframe_url`, so an answer is renderable
                // as long as a src can be built from what it does carry.
                const src = answerSrc(data, null);
                if (!src) break;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  const answers = last.answers || [];
                  if (answers.some((a) => answerSrc(a, null) === src)) return prev;
                  updated[updated.length - 1] = {
                    ...last,
                    answers: [...answers, data],
                  };
                  return updated;
                });
                break;
              }
              case "done":
                setResponseId(data.response_id);
                setStatus("");
                // The server has written the turn by the time it sends `done`.
                refreshConversations();
                break;
              case "error":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: `Error: ${data.message}`,
                    answers: last.answers || [],
                    isError: true,
                  };
                  return updated;
                });
                break;
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Failed to connect to server: ${error.message}`,
            isError: true,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setResponseId(null);
    setSessionId(null);
    setStatus("");
    setInput("");
  };

  return (
    <div className="shell">
      {historyAvailable && (
        <aside className="sidebar">
          <button className="new-chat-btn sidebar-new" onClick={startNewChat}>
            + New chat
          </button>
          <nav className="conversation-list">
            {conversations.length === 0 ? (
              <p className="sidebar-empty">No saved chats yet</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`conversation${
                    conversation.id === responseId ? " active" : ""
                  }`}
                  onClick={() => openConversation(conversation.id)}
                  disabled={isLoading}
                >
                  <span className="conversation-title">
                    {conversation.title}
                  </span>
                  <span
                    className="conversation-delete"
                    role="button"
                    tabIndex={0}
                    aria-label="Delete conversation"
                    onClick={(event) =>
                      deleteConversation(conversation.id, event)
                    }
                  >
                    ×
                  </span>
                </button>
              ))
            )}
          </nav>
        </aside>
      )}

      <div className="app">
        <header className="header">
          <div className="header-inner">
            <h1>ThoughtSpot Agent</h1>
            {messages.length > 0 && (
              <button className="new-chat-btn" onClick={startNewChat}>
                New Chat
              </button>
            )}
          </div>
        </header>

        <main className="chat-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">TS</div>
              <h2>Ask anything about your data</h2>
              <p>
                Powered by ThoughtSpot and Claude. Ask questions and get
                insights from your connected data sources.
              </p>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`message ${msg.role}${msg.isError ? " error" : ""}`}
                >
                  <div className="avatar">
                    {msg.role === "user" ? "U" : "TS"}
                  </div>
                  <div className="bubble">
                    {msg.role !== "assistant" ? (
                      <p>{msg.content}</p>
                    ) : (
                      <>
                        {(msg.answers || []).map((answer) => (
                          <figure
                            className="answer"
                            // Live answers are keyed by URL; stored ones have no
                            // URL, so their position in the conversation is the
                            // stable identity.
                            key={answer.iframe_url || `answer-${answer.answer_index}`}
                          >
                            {answer.title && (
                              <figcaption>{answer.title}</figcaption>
                            )}
                            <div
                              dangerouslySetInnerHTML={{
                                __html: answerHtml(answer, sessionId),
                              }}
                            />
                          </figure>
                        ))}
                        {msg.content ? (
                          // rehypeRaw so an <iframe> the model emits itself still renders.
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          !(msg.answers || []).length && (
                            <span className="typing-cursor" />
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {status && (
                <div className="status-bar">
                  <span className="status-dot" />
                  <span>{status}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <footer className="input-bar">
          <div className="input-inner">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 12V4M8 4L4 8M8 4L12 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
