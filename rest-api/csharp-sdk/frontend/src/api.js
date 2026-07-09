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
};
