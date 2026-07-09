// Thin fetch wrapper around the ASP.NET Core backend in ../backend.
const BASE = "http://localhost:5000";

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
