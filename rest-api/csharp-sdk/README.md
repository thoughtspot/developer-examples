# ThoughtSpot C# SDK — full-stack demo

A minimal two-process demo covering search users, search liveboards, and
exporting a liveboard's TML.

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

Or set the `VITE_TS_HOST` / `VITE_TS_USERNAME` / `VITE_TS_PASSWORD` /
`VITE_LIVEBOARD_ID` equivalents in `backend/.env` (loaded automatically at
startup).

### Why create-user / style-customization / PDF-export aren't here

They all require admin privileges. On a restricted sandbox account (e.g. a
training/trial cluster), those calls return a 403 "Operation is not allowed"
— a cluster permission limit, not something this demo can route around — so
they were dropped rather than shipped as broken buttons. Search users,
search liveboards, and TML export all work with a regular (non-admin)
account.

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
- TML export (`GET /api/liveboards/{id}/tml`) deserializes through
  Newtonsoft.Json internally (that's what the SDK uses), so the backend
  re-serializes the response with Newtonsoft before returning it — handing
  the raw `List<Object>` straight to ASP.NET Core's default System.Text.Json
  serializer silently produces near-empty `edoc`/`info` fields instead of an
  error, since it doesn't know how to write out Newtonsoft's JToken types.
