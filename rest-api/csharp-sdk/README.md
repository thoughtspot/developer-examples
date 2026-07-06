# ThoughtSpot C# SDK — full-stack demo

A minimal two-process demo covering user creation, style customization,
search users, search liveboards, export liveboard (PDF), and export TML.

```
backend/    ASP.NET Core minimal API (C#) wrapping the ThoughtSpot.Client SDK
frontend/   Vite + React app that calls the backend
```

## Configure

Both processes talk to the same cluster. Set these before running the backend
(defaults point at the same demo cluster used elsewhere in this repo):

```
export TS_HOST=https://<your-cluster>
export TS_USER=<username>
export TS_PASS=<password>
```

## Run

```bash
# terminal 1
cd backend
dotnet run          # listens on http://localhost:5000

# terminal 2
cd frontend
npm install
npm run dev          # listens on http://localhost:5173
```

Open http://localhost:5173.

## Notes

- The backend authenticates via `ThoughtSpotRestApi.CreateAsync(new ApiClientConfiguration { ... })`
  once at startup, rather than the legacy `HttpClient`/`HttpClientHandler`
  constructors. `CreateAsync` builds its own `SocketsHttpHandler`/`HttpClient`
  internally and is what actually gives you `ConnectTimeout`/`ReadTimeout`/
  `WriteTimeout`, connection pooling, SSL handling, and automatic bearer-token
  fetch + refresh. None of that is wired up if you construct the client from
  your own `HttpClient`/`HttpClientHandler`.
- CORS is locked to `http://localhost:5173` in `backend/Program.cs` — update
  if you serve the frontend elsewhere.
- "Export PDF" fetches the file as a blob and triggers a normal browser
  download; if the export fails (auth, bad liveboard id, etc.) the error
  message from the backend is shown in the UI instead of failing silently.
- `frontend/src/LiveboardEmbedView.jsx` is left over from an earlier version
  that embedded a live Liveboard via the Visual Embed SDK. It's unused now
  (no `@thoughtspot/visual-embed-sdk` credentials/setup here) — safe to
  delete if you don't plan to wire embedding back in.
