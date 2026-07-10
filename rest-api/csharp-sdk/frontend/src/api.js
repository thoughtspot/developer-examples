// Thin fetch wrapper around the ASP.NET Core backend in ../backend.
// In Vite dev mode, an empty base uses the same origin and is proxied by vite.config.js.
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function handle(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? res.statusText);
  return body;
}

export const api = {
  searchUsers: (query, size = 10) =>
    fetch(`${BASE}/api/users?query=${encodeURIComponent(query ?? "")}&size=${size}`).then(handle),

  searchLiveboards: (query, size = 10) =>
    fetch(`${BASE}/api/liveboards?query=${encodeURIComponent(query ?? "")}&size=${size}`).then(handle),

  exportTml: (id) => fetch(`${BASE}/api/liveboards/${id}/tml`).then(handle),

  // Opens a live SSE connection to /api/spotter/stream and relays each
  // ThoughtSpot agent event to the caller as it arrives — no waiting for
  // the full answer before showing anything.
  //   onEvent(event)     — one raw Spotter event object (type: ack | notification | text-chunk | text | answer | ...)
  //   onError(message)   — a fatal error occurred; the stream is already closed
  //   onDone()           — the agent finished responding; the stream is already closed
  // Returns a `stop()` function that closes the connection early.
  streamSpotter: (query, { onEvent, onError, onDone }) => {
    const url = `${BASE}/api/spotter/stream?query=${encodeURIComponent(query)}`;
    const source = new EventSource(url);

    source.onmessage = (e) => {
      try {
        const batch = JSON.parse(e.data);
        batch.forEach((evt) => onEvent(evt));
      } catch {
        // Ignore malformed/keepalive lines.
      }
    };

    source.addEventListener("done", () => {
      source.close();
      onDone();
    });

    source.addEventListener("ts-error", (e) => {
      const { error } = JSON.parse(e.data);
      source.close();
      onError(error);
    });

    // Fires if the connection drops before a "done"/"ts-error" frame arrives
    // (backend crashed, network blip, etc). EventSource retries by default,
    // so close it explicitly to stop that and surface the failure instead.
    source.onerror = () => {
      source.close();
      onError("Lost connection to the backend while streaming.");
    };

    return () => source.close();
  },
};
