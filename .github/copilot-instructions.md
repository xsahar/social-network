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
