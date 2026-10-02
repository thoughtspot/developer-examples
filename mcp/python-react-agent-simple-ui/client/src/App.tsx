import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  init,
  AuthType,
  startAutoMCPFrameRenderer,
  type AutoMCPFrameRendererViewConfig,
  type CustomisationsInterface,
} from "@thoughtspot/visual-embed-sdk";
import {
  getTheme,
  subscribeToTheme,
  toggleTheme,
  useTheme,
  type Theme,
} from "./theme";

/** Ids the embed route needs when a raw MCP update carries no ready-made URL. */
interface FrameParams {
  session_id: string;
  gen_no: number | null;
  ac_session_id: string | null;
  ac_gen_no: number | null;
}

/** One chart the Analytics Agent produced - streamed live, or replayed from history. */
interface Answer {
  answer_id?: string | null;
  title?: string | null;
  query?: string | null;
  iframe_url?: string | null;
  frame_params?: FrameParams | null;
  /** Position in the conversation; set on stored answers only. */
  answer_index?: number | null;
}

/**
 * One step of the Analytics Agent's own work, as the Spotter MCP server reports it:
 * a progress note, a stretch of its reasoning, or a query it tried before settling
 * on the answer. Not Claude's reasoning.
 */
interface WorkStep {
  kind: "step" | "thought" | "query";
  text: string;
  query?: string | null;
  /** A query's chart, on live steps only - stored steps are resolved on expand. */
  iframe_url?: string | null;
  frame_params?: FrameParams | null;
}

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
  answers?: Answer[];
  work?: WorkStep[];
  /** Stored turns only: ThoughtSpot's id for each Show work query, in order. */
  workAnswerIds?: string[];
  isError?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
}

interface ConversationDetail {
  id: string;
  analytical_session_id?: string | null;
  turns?: {
    role: Role;
    content: string;
    answers?: Answer[];
    work?: WorkStep[];
    work_answer_ids?: string[];
  }[];
}

/** Server-sent events on the /api/chat stream. */
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; message: string }
  | ({ type: "answer" } & Answer)
  | ({ type: "work" } & WorkStep)
  | { type: "done"; response_id: string }
  | { type: "error"; message: string };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const API_URL = "/api/chat";
const HISTORY_URL = "/api/conversations";
const TOKEN_URL = "/api/ts-token";

// The embed renders inside ThoughtSpot's own iframe, so our CSS cannot reach it - it
// only follows the `--ts-var-*` variables handed to the SDK. Keep these in step with
// App.css's dark tokens.
const DARK_SURFACE = "#171a21";
const DARK_TEXT = "#e8eaed";
const DARK_TEXT_MUTED = "#9aa0a6";
const DARK_BORDER = "#2a2f3a";

const embedDarkVariables: Record<string, string> = {
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
  "--ts-var-chip-color": DARK_SURFACE,
};

// The conversational-answer content wrapper paints its own white background, and no
// `--ts-var-*` covers it - so its padding stays a white frame around a dark chart. Only
// a raw selector reaches it. The class is a CSS module, so the runtime name carries a
// hash suffix: match on substring, not equality.
//
// Checked on champagne-master-aws.thoughtspotstaging.cloud (SDK 1.52.1): the dark
// `variables` apply there and the chart frame renders dark. An earlier check on the same
// cluster found no customCSS reaching these frames at all; if that returns, the likely
// cause is the CSS customization framework being off for the org (Develop >
// Customizations), not this code.
//
// rules_UNSTABLE is exactly that - unstable. These selectors are internal ThoughtSpot
// class names and can change on a cluster upgrade, at which point the padding goes white
// again and the selector below needs re-checking against the DOM.
const embedDarkRules: Record<string, Record<string, string>> = {
  '[class*="convAssistAnswerContentContainer"]': {
    background: `${DARK_SURFACE} !important`,
    color: `${DARK_TEXT} !important`,
  },
};

const embedDarkCustomizations: CustomisationsInterface = {
  style: {
    customCSS: {
      variables: embedDarkVariables,
      rules_UNSTABLE: embedDarkRules,
    },
  },
};

// The view config every chart frame is built from. The renderer reads it each time it
// creates a frame, so setting `customizations` here themes every frame created from then
// on - the toggle re-creates the frames already on screen (see AnswerFrame). Light leaves
// it unset, so ThoughtSpot's own default styling applies untouched. It is not set in
// init() on purpose: init() runs once, so a theme set there could never change.
const embedViewConfig: AutoMCPFrameRendererViewConfig = {
  frameParams: {
    height: "600px",
  },
};

const setEmbedTheme = (theme: Theme) => {
  embedViewConfig.customizations =
    theme === "dark" ? embedDarkCustomizations : undefined;
};
setEmbedTheme(getTheme());
// Registered before React subscribes to the theme, so the frames the next render creates
// already see the new palette.
const unsubscribeEmbedTheme = subscribeToTheme(() => setEmbedTheme(getTheme()));

init({
  thoughtSpotHost: import.meta.env.VITE_TS_HOST,
  authType: AuthType.TrustedAuthTokenCookieless,
  // The SDK requires a NEW token from every call - returning one constant trips its
  // duplicate-token check as soon as that token stops verifying, with no way back.
  // The backend mints a fresh short-lived token per request; no token in the bundle.
  getAuthToken: async (): Promise<string> => {
    const response = await fetch(TOKEN_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
    const { token } = (await response.json()) as { token: string };
    return token;
  },
  // Fetch a replacement before the current token expires, so the embed never lands
  // in a signed-out state mid-session.
  autoLogin: true,
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
const mcpFrameObserver = startAutoMCPFrameRenderer(embedViewConfig);

// In dev, Vite hot-reloads this module by running it again. Without this, every
// reload leaves the previous observer attached, and each one resolves every chart -
// duplicating the conversation-service calls once per reload since the page loaded.
import.meta.hot?.dispose(() => {
  mcpFrameObserver.disconnect();
  unsubscribeEmbedTheme();
});

/**
 * Add one streamed step to a turn's work. Reasoning arrives a few words per event,
 * so a `thought` continues the previous one - the server's `append_work` applies the
 * same rule, so a replayed turn matches what streamed live.
 */
const appendWork = (work: WorkStep[], step: WorkStep): WorkStep[] => {
  const last = work[work.length - 1];
  if (step.kind === "thought" && last?.kind === "thought") {
    return [...work.slice(0, -1), { ...last, text: last.text + step.text }];
  }
  return [
    ...work,
    {
      kind: step.kind,
      text: step.text,
      query: step.query,
      iframe_url: step.iframe_url,
      frame_params: step.frame_params,
    },
  ];
};

/** One row of the Show work timeline. Consecutive queries fold into one row. */
type WorkRow =
  | { kind: "thought"; text: string }
  | { kind: "step"; text: string }
  | { kind: "queries"; queries: { step: WorkStep; index: number }[] };

const workRows = (work: WorkStep[]): WorkRow[] => {
  const rows: WorkRow[] = [];
  // A query's position among the turn's queries is how the server finds it again.
  let queryIndex = 0;
  for (const step of work) {
    const text = step.text.trim();
    const last = rows[rows.length - 1];
    if (step.kind === "query") {
      const query = { step, index: queryIndex++ };
      if (last?.kind === "queries") last.queries.push(query);
      else rows.push({ kind: "queries", queries: [query] });
    } else if (text) {
      // Reasoning often arrives with leading blank lines - drop them, and skip
      // a thought that is only whitespace.
      rows.push({ kind: step.kind, text });
    }
  }
  return rows;
};

const ICON_PATHS = {
  search: "M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm3.5-1.5L14 14",
  memory:
    "M4.5 12.5a3 3 0 0 1-.4-6 4 4 0 0 1 7.8 0 3 3 0 0 1-.4 6M8 8v6m-2-2 2 2 2-2",
  chart: "M8 2v6h6A6 6 0 1 1 8 2zm2-.5A5 5 0 0 1 14.5 6H10z",
  chevron: "M6 4l4 4-4 4",
};

function WorkIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg className="work-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** Picks an icon for a progress step from its wording. */
const stepIcon = (text: string): keyof typeof ICON_PATHS => {
  if (/memor/i.test(text)) return "memory";
  if (/search|context|schema/i.test(text)) return "search";
  return "chart";
};

/**
 * The Analytics Agent's steps behind an answer, collapsed until asked for. Queries
 * are shown as text, never as charts: only the settled answer is a real one.
 */
/** Where a stored turn's thinking answers are loaded from. */
interface WorkSource {
  conversationId: string | null;
  answerIds: string[];
}

/**
 * In-flight and finished thinking-answer loads, by conversation and answer id.
 * Loading re-runs the answer on ThoughtSpot and takes tens of seconds, so a
 * remount (React StrictMode, reopening the row) must not start it again.
 */
const workAnswerLoads = new Map<string, Promise<FrameParams>>();

const loadWorkAnswer = (conversationId: string, answerId: string) => {
  const key = `${conversationId}/${answerId}`;
  let load = workAnswerLoads.get(key);
  if (!load) {
    load = fetch(
      `${HISTORY_URL}/${conversationId}/work-answers/${encodeURIComponent(answerId)}`,
    ).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      return ((await response.json()) as { frame_params: FrameParams }).frame_params;
    });
    // A failure is not kept, so expanding the row again retries.
    load.catch(() => workAnswerLoads.delete(key));
    workAnswerLoads.set(key, load);
  }
  return load;
};

/**
 * The chart for one query the Agent tried. A live step carries its URL. A stored
 * one does not - it would have expired - so the server loads that thinking answer
 * again by its position. Thinking answers are outside the SDK's stored-answer
 * index, which counts only settled answers, so they cannot use that path.
 */
function WorkQueryChart({
  step,
  index,
  source,
}: {
  step: WorkStep;
  index: number;
  source: WorkSource;
}) {
  const theme = useTheme();
  const liveSrc = answerSrc(step, null);
  const answerId = source.answerIds[index];
  const conversationId = source.conversationId;
  const [resolved, setResolved] = useState<FrameParams | null>(null);
  const [failed, setFailed] = useState(false);
  // Bumped by Retry to run the load again; the failed load is already evicted.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (liveSrc || !conversationId || !answerId) return;
    let cancelled = false;
    setFailed(false);
    loadWorkAnswer(conversationId, answerId)
      .then((frame_params) => {
        if (!cancelled) setResolved(frame_params);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [liveSrc, conversationId, answerId, step, attempt]);

  const html = liveSrc
    ? answerHtml(step, null, theme)
    : resolved && answerHtml({ ...step, frame_params: resolved }, null, theme);
  // Nothing to load: a stored step ThoughtSpot has no answer for.
  if (!liveSrc && (!conversationId || !answerId)) return null;
  if (failed) {
    return (
      <p className="work-chart-note">
        Could not load this chart.{" "}
        <button className="work-retry" onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </button>
      </p>
    );
  }
  if (!html) return <p className="work-chart-note">Loading chart…</p>;
  return (
    <div className="work-chart">
      <AnswerFrame key={html} html={html} />
    </div>
  );
}

/**
 * One "Visualized data" row. Its charts mount the first time it is expanded, and
 * stay mounted after - closing and reopening must not load them again.
 */
function WorkQueries({
  queries,
  source,
}: {
  queries: { step: WorkStep; index: number }[];
  source: WorkSource;
}) {
  const [opened, setOpened] = useState(false);
  const count = queries.length;
  return (
    <details
      className="work-body work-queries"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary>
        {count === 1 ? "Visualized data" : `Created ${count} visualizations`}
        <WorkIcon name="chevron" />
      </summary>
      {queries.map(({ step, index }) => (
        <div key={index} className="work-query">
          {step.text && <div className="work-query-title">{step.text}</div>}
          {step.query && <code>{step.query}</code>}
          {opened && <WorkQueryChart step={step} index={index} source={source} />}
        </div>
      ))}
    </details>
  );
}

function ShowWork({
  work,
  finished,
  source,
}: {
  work: WorkStep[];
  finished: boolean;
  source: WorkSource;
}) {
  const rows = workRows(work);
  if (!rows.length) return null;
  return (
    <details className="show-work">
      <summary>
        Show work
        <WorkIcon name="chevron" />
      </summary>
      <ul className="work-timeline">
        {rows.map((row, i) => {
          if (row.kind === "thought") {
            return (
              <li key={i} className="work-thought">
                <span className="work-marker work-dot" />
                <div className="work-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {row.text}
                  </ReactMarkdown>
                </div>
              </li>
            );
          }
          if (row.kind === "step") {
            return (
              <li key={i} className="work-step">
                <span className="work-marker">
                  <WorkIcon name={stepIcon(row.text)} />
                </span>
                <div className="work-body">{row.text}</div>
              </li>
            );
          }
          return (
            <li key={i} className="work-step">
              <span className="work-marker">
                <WorkIcon name="chart" />
              </span>
              <WorkQueries queries={row.queries} source={source} />
            </li>
          );
        })}
        {finished && (
          <li className="work-step work-finished">
            <span className="work-marker work-dot" />
            <div className="work-body">Finished</div>
          </li>
        )}
      </ul>
    </details>
  );
}

const escapeAttr = (value: unknown) =>
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
const answerSrc = (
  answer: Answer,
  conversationSessionId: string | null,
): string | null => {
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
      acSessionId: String(p.ac_session_id),
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
 * What the placeholder iframe shows until the renderer swaps it for the real embed.
 *
 * `srcdoc` takes precedence over `src`, so the browser never loads `src` itself - the
 * renderer only reads it. Without this the placeholder loads ThoughtSpot directly and
 * unauthenticated: ThoughtSpot redirects it to the SSO login page, which refuses to be
 * framed, and the frame shows an error with CSP violations in the console for as long
 * as resolving the answer takes. For a stored answer that is one ThoughtSpot round trip
 * to look up the conversation and another to load the answer - 25s+ on a loaded cluster.
 */
const placeholderDoc = (theme: Theme) =>
  `<!doctype html><html style="color-scheme:${theme}"><body style="margin:0;` +
  "height:100vh;display:flex;align-items:center;justify-content:center;" +
  `font:14px system-ui,sans-serif;color:#9aa0a6;background:${
    theme === "dark" ? DARK_SURFACE : "#ffffff"
  }">Loading chart…</body></html>`;

/**
 * Markup for one MCP answer iframe - AnswerFrame puts it in the DOM.
 *
 * The theme is part of the markup (through the placeholder), so a theme change changes
 * the markup, and callers key AnswerFrame by it: the toggle re-creates every frame, and
 * the renderer builds each again with the new palette.
 */
const answerHtml = (
  answer: Answer,
  conversationSessionId: string | null,
  theme: Theme,
) => {
  const src = answerSrc(answer, conversationSessionId);
  if (!src) return "";
  return `<iframe src="${escapeAttr(src)}" srcdoc="${escapeAttr(
    placeholderDoc(theme),
  )}" title="${escapeAttr(
    answer.title || "ThoughtSpot answer",
  )}" style="width:100%;border:none"></iframe>`;
};

/**
 * One MCP answer's iframe, written into the DOM exactly once.
 *
 * startAutoMCPFrameRenderer swaps the iframe for the real embed via replaceWith(), so
 * React must not own that node - it owns only this wrapper, filled with
 * `dangerouslySetInnerHTML`. React re-applies that prop whenever it receives a new
 * object, and a fresh `{ __html }` literal is a new object on every render of the message
 * list - each keystroke, each streamed delta. Every re-application throws the embed away
 * and the renderer resolves the answer again from scratch: two ThoughtSpot calls per
 * chart, and a stored answer's take tens of seconds.
 *
 * So the prop object is created once per mount and kept in state (which also survives
 * dev Fast Refresh). Callers key this by `html`, so a different answer gets a fresh
 * wrapper. The markup goes in before the wrapper is attached, so the renderer sees the
 * iframe once - writing it from an effect instead would show it twice, via the attached
 * container and via the iframe itself, and resolve it twice.
 */
function AnswerFrame({ html }: { html: string }) {
  const [markup] = useState(() => ({ __html: html }));
  return <div dangerouslySetInnerHTML={markup} />;
}

/** The icon for the mode a click switches to: a sun in dark mode, a moon in light. */
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {theme === "dark" ? (
        <>
          <circle cx="8" cy="8" r="2.75" />
          <path d="M8 1.5v1.75M8 12.75v1.75M1.5 8h1.75M12.75 8h1.75M3.4 3.4l1.25 1.25M11.35 11.35l1.25 1.25M3.4 12.6l1.25-1.25M11.35 4.65l1.25-1.25" />
        </>
      ) : (
        <path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" />
      )}
    </svg>
  );
}

function App() {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  // ThoughtSpot analytical session for the open conversation. Only a reopened
  // chat needs it - live answers arrive with a URL already attached.
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Chat history. `historyAvailable` stays false against a backend without the
  // /api/conversations endpoints, and the sidebar simply isn't rendered.
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyAvailable, setHistoryAvailable] = useState(false);
  // The stored chat being fetched. Opening one waits on ThoughtSpot (the server
  // reconciles its answers against the live conversation), so it can take seconds.
  const [openingId, setOpeningId] = useState<string | null>(null);
  // Bumped on every open / new chat, so only the latest request's response lands.
  const openRequestRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch(HISTORY_URL);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as {
        conversations?: ConversationSummary[];
      };
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
    async (id: string) => {
      if (isLoading) return;
      const request = ++openRequestRef.current;
      setOpeningId(id);
      setStatus("");
      try {
        const response = await fetch(`${HISTORY_URL}/${id}`);
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as ConversationDetail;
        // Another chat was opened, or a new one started, while this was loading.
        if (request !== openRequestRef.current) return;
        setMessages(
          (data.turns || []).map((turn) => ({
            role: turn.role,
            content: turn.content,
            answers: turn.answers || [],
            work: turn.work || [],
            workAnswerIds: turn.work_answer_ids || [],
          })),
        );
        setResponseId(data.id);
        setSessionId(data.analytical_session_id || null);
        setStatus("");
      } catch (error) {
        if (request !== openRequestRef.current) return;
        setStatus(`Could not open that conversation: ${errorMessage(error)}`);
      } finally {
        if (request === openRequestRef.current) setOpeningId(null);
      }
    },
    [isLoading],
  );

  const deleteConversation = useCallback(
    async (id: string, event: MouseEvent) => {
      event.stopPropagation();
      if (id === openingId) {
        // Deleting the chat that is still loading: drop the load too.
        openRequestRef.current++;
        setOpeningId(null);
      }
      await fetch(`${HISTORY_URL}/${id}`, { method: "DELETE" });
      if (id === responseId) {
        setMessages([]);
        setResponseId(null);
      }
      refreshConversations();
    },
    [responseId, openingId, refreshConversations],
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
    // While a stored chat loads, a send would go to the previous conversation and
    // its reply would land in the one being opened.
    if (!input.trim() || isLoading || openingId) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setStatus("Thinking...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", answers: [], work: [] },
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

      if (!response.body) throw new Error("Server sent an empty response");
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
            const data = JSON.parse(line.slice(6)) as StreamEvent;

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
              case "work":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    work: appendWork(last.work || [], data),
                  };
                  return updated;
                });
                break;
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
                    work: last.work || [],
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
            content: `Failed to connect to server: ${errorMessage(error)}`,
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    // Drop any chat still loading, so it doesn't replace the new one when it lands.
    openRequestRef.current++;
    setOpeningId(null);
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
                    conversation.id === (openingId ?? responseId) ? " active" : ""
                  }${conversation.id === openingId ? " loading" : ""}`}
                  onClick={() => openConversation(conversation.id)}
                  disabled={isLoading}
                  aria-busy={conversation.id === openingId}
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
            <div className="header-actions">
              {messages.length > 0 && (
                <button className="new-chat-btn" onClick={startNewChat}>
                  New Chat
                </button>
              )}
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                <ThemeIcon theme={theme} />
              </button>
            </div>
          </div>
        </header>

        <main className="chat-area">
          {openingId ? (
            <div className="chat-loading" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <p>Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
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
                        {!!msg.work?.length && (
                          <ShowWork
                            work={msg.work}
                            // The last turn is still streaming while a send is in flight.
                            finished={!(isLoading && i === messages.length - 1)}
                            source={{
                              conversationId: responseId,
                              answerIds: msg.workAnswerIds || [],
                            }}
                          />
                        )}
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
                            {(() => {
                              const html = answerHtml(answer, sessionId, theme);
                              return <AnswerFrame key={html} html={html} />;
                            })()}
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
                          !(msg.answers || []).length &&
                          !(msg.work || []).length && (
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
              disabled={isLoading || openingId !== null}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || openingId !== null}
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
