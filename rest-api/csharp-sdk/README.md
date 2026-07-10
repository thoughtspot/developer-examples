<!-- search-meta
tags: [ThoughtSpot, C#, ASP.NET, Vite, React, backend, frontend, Codespaces]
apis: [thoughtspot_rest_api_sdk, ASP.NET Core, Vite, React]
questions:
  - How do I connect a React frontend to an ASP.NET Core backend in GitHub Codespaces?
  - How do I configure ThoughtSpot credentials for a C# SDK demo?
  - How do I proxy Vite frontend requests to a local ASP.NET Core backend?
  - How do I run a ThoughtSpot C# SDK full-stack demo in GitHub Codespaces?
  - How do I use ThoughtSpot API with React and Vite?
-->

# ThoughtSpot C# SDK — full-stack demo

Open this directory in GitHub Codespaces

A minimal two-process demo covering search users, search liveboards,
exporting a liveboard's TML, and asking Spotter a natural-language question
with a live streaming (SSE) answer.

```
backend/    ASP.NET Core minimal API (C#) wrapping the thoughtspot_rest_api_sdk package
frontend/   Vite + React app that calls the backend
```

## Configure

Both processes talk to the same cluster. Set these before running the backend
(defaults point at the same demo cluster used elsewhere in this repo):

```
export TS_HOST=https://<your-cluster>
export TS_USER=<username>
export TS_PASS=<password>
export TS_SPOTTER_WORKSHEET_ID=<worksheet-guid-with-AI-answer-generation-enabled>
```

Or set the `VITE_TS_HOST` / `VITE_TS_USERNAME` / `VITE_TS_PASSWORD` /
`VITE_LIVEBOARD_ID` / `VITE_SPOTTER_WORKSHEET_ID` equivalents in
`backend/.env` (loaded automatically at startup).

### Why create-user / style-customization / PDF-export aren't here

They all require admin privileges. On a restricted sandbox account (e.g. a
training/trial cluster), those calls return a 403 "Operation is not allowed"
— a cluster permission limit, not something this demo can route around — so
they were dropped rather than shipped as broken buttons. Search users,
search liveboards, TML export, and Spotter all work with a regular
(non-admin) account, as long as `CAN_USE_SPOTTER` is granted for Spotter.

The worksheet used for Spotter must have AI Answer Generation enabled
(check the worksheet's metadata header — some sample worksheets ship with
it disabled and Spotter returns "No answer found for your query" for them).

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
- Spotter (`GET /api/spotter/stream`) creates a fresh agent conversation via
  `CreateAgentConversation`, then relays
  `SendAgentConversationMessageStreamingStreamAsync`'s Server-Sent Events
  straight through to the browser as they arrive — the frontend consumes it
  with a native `EventSource` (see `frontend/src/api.js`'s `streamSpotter`).
  A custom `done` SSE event signals a clean finish and a custom `ts-error`
  event carries backend/API errors; both close the connection to stop the
  browser's default auto-reconnect behavior.
  - **SDK workaround**: `thoughtspot_rest_api_sdk`'s `DataSourceContextInput`
    model always serializes its unused sibling fields
    (`data_source_identifiers`, `guid`) as explicit JSON `null`s — confirmed
    still present as of `0.1.0-beta.7`. This cluster's request validation
    rejects that shape (it falls back to expecting a `worksheet_context`
    payload instead of `data_source_context`, and complains that its
    `worksheet_ids` field is missing). The backend works around this by
    leaving `ContextPayloadV2Input.DataSourceContext` unset and writing the
    minimal `data_source_context` object via `AdditionalProperties` instead,
    which avoids emitting the nulls. Worth retrying without the workaround on
    newer SDK versions.
