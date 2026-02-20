import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { init, AuthType,  startAutoMCPFrameRenderer } from "@thoughtspot/visual-embed-sdk";

const API_URL = "/api/chat";

init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.TrustedAuthTokenCookieless,
  getAuthToken: async () => {
    return import.meta.env.VITE_TS_AUTH_TOKEN; // Do not use in production, use a secure token fetching logic.
  },
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

startAutoMCPFrameRenderer({
  frameParams: {
    height: "600px"
  }
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [responseId, setResponseId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
      { role: "assistant", content: "" },
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
              case "done":
                setResponseId(data.response_id);
                setStatus("");
                break;
              case "error":
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: `Error: ${data.message}`,
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
    setStatus("");
    setInput("");
  };

  return (
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
              Powered by ThoughtSpot and OpenAI. Ask questions and get insights
              from your connected data sources.
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
                  {msg.role === "assistant" && msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.role === "assistant" && !msg.content ? (
                    <span className="typing-cursor" />
                  ) : (
                    <p>{msg.content}</p>
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
  );
}

export default App;
