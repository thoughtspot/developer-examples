// Thin fetch wrapper around the ASP.NET Core backend in ../backend.
const BASE = "http://localhost:5000";

async function handle(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? res.statusText);
  return body;
}

export const api = {
  createUser: (payload) =>
    fetch(`${BASE}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  updateStyle: (payload) =>
    fetch(`${BASE}/api/style`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  searchUsers: (query, size = 10) =>
    fetch(`${BASE}/api/users?query=${encodeURIComponent(query ?? "")}&size=${size}`).then(handle),

  searchLiveboards: (query, size = 10) =>
    fetch(`${BASE}/api/liveboards?query=${encodeURIComponent(query ?? "")}&size=${size}`).then(handle),

  // Fetches the PDF as a blob (rather than a raw <a href> navigation) so a
  // non-2xx response — auth failure, bad liveboard id, etc. — surfaces as a
  // catchable error with the backend's message instead of silently opening
  // a blank tab. Triggers a normal browser "Save As" download on success.
  exportLiveboard: async (id, name) => {
    const res = await fetch(`${BASE}/api/liveboards/${id}/export`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Export failed (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name ?? "liveboard"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportTml: (id) => fetch(`${BASE}/api/liveboards/${id}/tml`).then(handle),
};
