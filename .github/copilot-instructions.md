## Social Network — Copilot instructions (concise)

This repo is a full-stack social app: Go backend + Next.js frontend. The purpose of this file is to get an AI coding agent productive quickly with concrete, project-specific patterns, files, and commands.

Quick run (what humans do locally)
- Backend: from repo root -> `cd backend && go run .` (or `./back.sh`). Server listens on :8080 and exposes `/ws` for WebSockets.
- Frontend: `cd frontend-next && npm run dev` (or `./front.sh`). Next runs on :3000 and Next API routes proxy cookies to the Go backend.

Key files to read first
- `backend/web/connectWeb.go` — central HTTP route registration and CORS wrapper usage.
- `backend/server.go` — backend entrypoint and DB startup.
- `backend/pkg/apis/chat/chatHub.go` — WebSocket hub and broadcast channel.
- `backend/pkg/db/*` — DB helpers (select/insert/update); migrations at `backend/pkg/db/migrations/sqlite/`.
- `frontend-next/contexts/WebSocketContext.js` — global WS connection and subscription model.
- `frontend-next/pages/api/*` — Next API proxy routes that forward cookies to the backend.

Project-specific rules and examples (copy these)
- Session validation: every backend handler must validate sessions using the existing helper.
  Example: `userID, loggedIn := u.ValidateSession(db, r)` — return 401 when not logged in.
- Register handlers only in `backend/web/connectWeb.go` and wrap with the CORS helper: `cor.WithCORS(...)`.
- WebSocket model: single persistent connection per user. Use the backend hub for cross-user events.
  Broadcast example: `hub.Broadcast <- Frontend{Type: "new_groupPost"}`.
- Frontend WS usage: `WebSocketContext` opens one connection; components subscribe to a message type, then fetch REST data to refresh UI (WS messages are signals, not authoritative payloads).
- Next API proxy pattern: Next API routes must forward cookies to the backend when calling it.
  Example: `fetch('http://localhost:8080/api', { headers: { Cookie: req.headers.cookie } })`.

Database & migrations
- DB file: `backend/data/` (SQLite). Migrations: `backend/pkg/db/migrations/sqlite/`.
- DB helpers use raw SQL (`database/sql`). Reuse `backend/pkg/db/*` helper functions — avoid duplicating SQL patterns.

How to add a new endpoint (minimal checklist)
1. Implement handler in `backend/*`, reusing DB helpers.
2. Validate session with `u.ValidateSession(db, r)`.
3. Register route in `backend/web/connectWeb.go` and wrap with `cor.WithCORS(...)`.
4. If change impacts multiple users, broadcast via `hub.Broadcast <- Frontend{Type: "..."}`.
5. On frontend, subscribe to the event in `WebSocketContext` and call the REST endpoint to refresh UI state.

Conventions & gotchas
- Do NOT open multiple WebSocket connections per user — use the single `WebSocketContext` provider.
- Keep WS messages small; treat them as triggers to fetch canonical state via REST.
- Reuse existing DB helper functions (`select.go`, `insert.go`, etc.). Keep naming/param styles consistent.

Developer workflows & verification
- Start backend and frontend as above; check backend logs (console) on :8080 and frontend console for subscription/refresh calls.
- Helper scripts: `back.sh` and `front.sh` at repo root.

If you want more
- Say which file or pattern you want expanded (e.g., a handler template, broadcast + frontend subscription example, or a tiny test). I will add a runnable snippet and verification steps.

Last-updated: concise update to focus AI agent onboarding.
## Social Network — Copilot instructions (concise)

This repo is a full-stack social app: Go backend + Next.js frontend. The goal of these notes is to get an AI coding agent productive quickly with minimal hand-holding.

- Backend: Go (entry: `backend/server.go`), routes in `backend/web/connectWeb.go`, DB helpers under `backend/pkg/db/*` (plain `database/sql`, no ORM). SQLite DB file lives in `backend/data/`.
- Frontend: Next.js (Pages Router) under `frontend-next/`. API proxy routes live in `frontend-next/pages/api/*`. Global WebSocket state in `frontend-next/contexts/WebSocketContext.js`.

Key patterns you must follow (do not deviate):
- Sessions: every handler validates session. Use the same pattern as other handlers: `userID, loggedIn := u.ValidateSession(db, r)` and return 401 when not logged in.
- CORS & route wiring: register HTTP endpoints in `backend/web/connectWeb.go` and wrap handlers with the project's CORS helper (example: `cor.WithCORS(...)`).
- WebSocket model: single persistent WS per user. Backend hub is `backend/pkg/apis/chat/chatHub.go`. Broadcast events via the hub (`hub.Broadcast <- Frontend{Type: "..."}`) rather than writing ad-hoc socket code.
- Frontend WS usage: `frontend-next/contexts/WebSocketContext.js` opens one connection per user. Components should subscribe to message types and then refresh server state by calling REST endpoints (do not treat WS message payloads as source-of-truth).

How to run locally (observed commands):
- Backend: from repo root: `cd backend && go run .` (there's also `back.sh` helper). The server listens on :8080 and registers `/ws` for WebSockets.
- Frontend: `cd frontend-next && npm run dev` (there's also `front.sh`). Next API routes proxy cookies to the Go backend when forwarding requests.

Important code examples to copy when adding features:
- Session check pattern: `userID, loggedIn := u.ValidateSession(db, r)` — follow this exactly to avoid auth regressions.
- Broadcast pattern: `hub.Broadcast <- Frontend{Type: "new_groupPost"}` — use the hub for cross-user events.
- Proxy call from Next API: `fetch('http://localhost:8080/...', { headers: { Cookie: req.headers.cookie } })` — preserve cookies when calling backend from Next API routes.

Database/Schema notes:
- Migrations: `backend/pkg/db/migrations/sqlite/`. DB access code lives under `backend/pkg/db/*.go`. Expect raw SQL and helper functions (no ORM). Keep SQL changes consistent with existing query helpers.

Conventions and small gotchas:
- Do not open multiple WebSocket connections per user. Use the existing `WebSocketContext` provider.
- When adding a REST handler, always use `connectWeb.go` registration style and wrap with `cor.WithCORS`.
- Prefer broadcasting a short message type (e.g. `new_groupPost`) and let the frontend refresh state via REST endpoints.
- Use existing DB helper functions where possible (look for `select.go`, `insert.go`, etc.) rather than duplicating SQL.

Files to read first (high-value):
- `backend/web/connectWeb.go` — route registration and CORS usage.
- `backend/pkg/apis/chat/chatHub.go` — WebSocket hub and message types.
- `frontend-next/contexts/WebSocketContext.js` — how the client manages the single WS connection and subscriptions.
- `frontend-next/hooks/useSession.js` — session usage on client side.

If you need to add endpoints or broadcast events:
1. Add the handler and register it in `backend/web/connectWeb.go` using `cor.WithCORS`.
2. Validate sessions with the project's helper.
3. If the change affects multiple users, broadcast via `hub.Broadcast <- Frontend{Type: "..."}`.
4. On the frontend, subscribe to the message type and call the appropriate REST API to refresh UI state.

When updating this file: keep it short and concrete. If anything here is unclear, point to the file you want expanded and I will add exact examples or small tests.

---
Last-updated: automated edit to consolidate repo-specific AI guidance.
## Social Network — AI development quick reference

This repo is a full-stack social app: Go backend + Next.js frontend. AI agents should focus on two integration surfaces: REST handlers in `backend/web/connectWeb.go` and the WebSocket flow in `backend/pkg/apis/chat/chatHub.go` + `frontend-next/contexts/WebSocketContext.js`.

Essentials (quick):
- Backend: `server.go` (entry), routes in `backend/web/connectWeb.go`, DB helpers in `backend/pkg/db/*` (plain `database/sql`, no ORM).
- Frontend: Next.js Pages Router under `frontend-next/pages`, API proxies in `frontend-next/pages/api/*`, global WS in `frontend-next/contexts/WebSocketContext.js`.

Key repo-specific patterns and examples:
- Sessions: handlers always call session validation. Example:
  `userID, loggedIn := u.ValidateSession(db, r)` — if not logged in return 401. See many handlers under `backend/*`.
- CORS/proxy pattern: frontend calls Next API routes which forward cookies to Go. See `pages/api/session.js` and calls that `fetch('http://localhost:8080/...', { headers: { Cookie: req.headers.cookie } })`.
- WebSockets: single persistent connection per user (managed by `WebSocketProvider` in `_app.js`). Backend broadcasts using `hub.Broadcast <- Frontend{Type: "..."}`; frontend components `subscribe()` and refresh their data on relevant message types (e.g., `new_groupPost`). See `GroupPostsSection.js` for subscription example.
- Routes: all HTTP endpoints are registered in `backend/web/connectWeb.go`. Most handlers are wrapped with a CORS helper (e.g. `cor.WithCORS(...)`) — keep this when adding new routes.

How to run locally (observed patterns):
- Backend: cd `backend` && `go run .` (serves :8080, includes `/ws`). There is a helper script `back.sh`.
- Frontend: cd `frontend-next` && `npm run dev` (serves :3000). There is `front.sh`.
- Use VS Code tasks "Start Backend Server" and "Start Frontend Server" if configured.

Database & migrations:
- Uses SQLite in `data/` and SQL migrations under `backend/pkg/db/migrations/sqlite/`. Migrations are applied on backend startup (golang-migrate patterns).

Files to read first (highest value):
- `backend/web/connectWeb.go` — route registry and wrappers
- `backend/pkg/apis/chat/chatHub.go` — WebSocket hub and message types
- `frontend-next/contexts/WebSocketContext.js` — subscription and dispatch model
- `frontend-next/hooks/useSession.js` — how sessions and cookies are handled client-side

Quick agent rules (do this, not that):
- DO use existing route registration and CORS wrappers when adding endpoints.
- DO broadcast backend events via the `hub.Broadcast` channel rather than attempting ad-hoc socket writes.
- DO prefer refreshing server state when a WS message arrives (components call the REST API) rather than trusting message payloads as source of truth.
- DO NOT create multiple WebSocket connections per user; reuse `WebSocketContext`.

If anything is unclear, point to the file you want expanded and I will merge more examples or wire small tests.
# Social Network Application - AI Development Guide

## Architecture Overview

This is a **full-stack social network** with a Go backend and Next.js (Pages Router) frontend, communicating via REST APIs and WebSockets for real-time features.

**Stack**: Go 1.23 + SQLite + Gorilla WebSocket | Next.js 15 + React 19

### Key Components

```
Backend (Go):
  - server.go → Entry point, serves on :8080
  - web/connectWeb.go → HTTP route handler registry (70+ endpoints)
  - pkg/apis/chat/chatHub.go → WebSocket hub for real-time messaging
  - pkg/db/sqlite/ → Database connection + migrations
  - data/socialnetwork.db → SQLite database

Frontend (Next.js):
  - contexts/WebSocketContext.js → Global WS connection manager
  - pages/api/* → Next.js API routes that proxy to Go backend
  - hooks/useSession.js → Session management hook
## Social Network — AI development quick reference

This repo is a full-stack social app: Go backend + Next.js frontend. AI agents should focus on two integration surfaces: REST handlers in `backend/web/connectWeb.go` and the WebSocket flow in `backend/pkg/apis/chat/chatHub.go` + `frontend-next/contexts/WebSocketContext.js`.

Essentials (quick):
- Backend: `server.go` (entry), routes in `backend/web/connectWeb.go`, DB helpers in `backend/pkg/db/*` (plain `database/sql`, no ORM).
- Frontend: Next.js Pages Router under `frontend-next/pages`, API proxies in `frontend-next/pages/api/*`, global WS in `frontend-next/contexts/WebSocketContext.js`.

Key repo-specific patterns and examples:
- Sessions: handlers always call session validation. Example:
  `userID, loggedIn := u.ValidateSession(db, r)` — if not logged in return 401. See many handlers under `backend/*`.
- CORS/proxy pattern: frontend calls Next API routes which forward cookies to Go. See `pages/api/session.js` and calls that `fetch('http://localhost:8080/...', { headers: { Cookie: req.headers.cookie } })`.
- WebSockets: single persistent connection per user (managed by `WebSocketProvider` in `_app.js`). Backend broadcasts using `hub.Broadcast <- Frontend{Type: "..."}`; frontend components `subscribe()` and refresh their data on relevant message types (e.g., `new_groupPost`). See `GroupPostsSection.js` for subscription example.
- Routes: all HTTP endpoints are registered in `backend/web/connectWeb.go`. Most handlers are wrapped with a CORS helper (e.g. `cor.WithCORS(...)`) — keep this when adding new routes.

How to run locally (observed patterns):
- Backend: cd `backend` && `go run .` (serves :8080, includes `/ws`). There is a helper script `back.sh`.
- Frontend: cd `frontend-next` && `npm run dev` (serves :3000). There is `front.sh`.
- Use VS Code tasks "Start Backend Server" and "Start Frontend Server" if configured.

Database & migrations:
- Uses SQLite in `data/` and SQL migrations under `backend/pkg/db/migrations/sqlite/`. Migrations are applied on backend startup (golang-migrate patterns).

Files to read first (highest value):
- `backend/web/connectWeb.go` — route registry and wrappers
- `backend/pkg/apis/chat/chatHub.go` — WebSocket hub and message types
- `frontend-next/contexts/WebSocketContext.js` — subscription and dispatch model
- `frontend-next/hooks/useSession.js` — how sessions and cookies are handled client-side

Quick agent rules (do this, not that):
- DO use existing route registration and CORS wrappers when adding endpoints.
- DO broadcast backend events via the `hub.Broadcast` channel rather than attempting ad-hoc socket writes.
- DO prefer refreshing server state when a WS message arrives (components call the REST API) rather than trusting message payloads as source of truth.
- DO NOT create multiple WebSocket connections per user; reuse `WebSocketContext`.

If anything is unclear, point to the file you want expanded and I will merge more examples or wire small tests.
