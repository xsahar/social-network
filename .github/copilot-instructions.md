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
```

## Critical Patterns

### 1. Session-Based Authentication
**Every protected endpoint** requires session validation:

```go
// Backend pattern (used in ALL handlers)
userID, loggedIn := u.ValidateSession(db, r)
if !loggedIn {
    http.Error(w, "Unauthorized", http.StatusUnauthorized)
    return
}
```

Sessions stored in SQLite with UUID tokens, 24hr expiry. Frontend uses cookies via `credentials: 'include'`.

### 2. WebSocket Real-Time Architecture
**Single persistent connection per user** established in `_app.js` via `WebSocketProvider`. All components subscribe to the same connection.

**Message Flow**:
1. Backend broadcasts typed messages via `Hub.Broadcast` channel
2. `WebSocketContext` receives and distributes to subscribers
3. Components subscribe with filters (by `type`, `group_id`, etc.)

**Critical Message Types**:
- `new_post`, `new_postLike`, `new_comment` → Posts page
- `new_groupPost`, `group_post_like_update` → Group posts
- `new_groupEvent` → Group events
- `group_message` → Group chat
- `online_users` → User presence

**Component Pattern** (see `GroupPostsSection.js`):
```javascript
const { subscribe } = useWebSocketContext();

useEffect(() => {
  const unsubscribe = subscribe((message) => {
    if (message.type === 'new_groupPost' && message.group_id == groupId) {
      fetchGroupPosts(); // Refresh data
    }
  });
  return () => unsubscribe();
}, [groupId, subscribe]);
```

### 3. API Communication Pattern
**Frontend → Next.js API Route → Go Backend**

Next.js proxies requests to avoid CORS issues and forward cookies:
```javascript
// pages/api/session.js pattern
const response = await fetch('http://localhost:8080/check-session', {
  headers: { 'Cookie': req.headers.cookie || '' }
});
```

**Direct calls from pages** for simplicity (CORS enabled via `WithCORS` wrapper):
```javascript
fetch('http://localhost:8080/groups/${groupId}/posts', {
  credentials: 'include' // Required for session cookies
})
```

### 4. Route Registration (Backend)
All routes registered in `web/connectWeb.go`:
```go
http.HandleFunc("/api/follow", cor.WithCORS(func(w, r) { ... }))
```
**CORS wrapper required** for all endpoints accessed from frontend.

### 5. Database Access
**No ORM** - direct SQL via `database/sql`:
```go
database.InsertGroup(db, userID, title, desc) // Helper functions in pkg/db/
db.Exec("INSERT INTO ...") // Direct queries in handlers
```

Migrations in `pkg/db/migrations/sqlite/*.up.sql` (auto-run on startup via `golang-migrate`).

## Development Workflow

### Running Locally
```bash
# Backend (Terminal 1)
cd backend && go run .  # Serves :8080, includes WebSocket /ws endpoint

# Frontend (Terminal 2)  
cd frontend-next && npm run dev  # Serves :3000

# Or use scripts:
./back.sh
./front.sh
```

### VS Code Tasks
Use **"Start Backend Server"** and **"Start Frontend Server"** tasks (already configured).

### Database Changes
1. Create migration pair in `backend/pkg/db/migrations/sqlite/`:
   - `NNNNNN_description.up.sql`
   - `NNNNNN_description.down.sql`
2. Restart backend (migrations auto-apply)

### Adding Real-Time Updates
When adding features that need real-time sync:
1. **Backend**: Broadcast message via `hub.Broadcast <- Frontend{Type: "new_X", ...}`
2. **Frontend**: Add `subscribe()` listener in component with type filter
3. **Refresh data** when message received (don't trust message payload for full state)

## Common Gotchas

- **WebSocket connection per user**: Don't create multiple connections. Use `WebSocketContext`.
- **Session validation**: Don't forget `ValidateSession` on protected endpoints.
- **CORS**: Wrap all API handlers with `cor.WithCORS()`.
- **Group ID types**: Backend uses `int`, frontend may pass strings - convert carefully.
- **Image uploads**: Use `FormData` and file handling in `createPost.go` patterns.
- **Privacy levels**: Posts have `privacy` field (public/private/almost_private) enforced in query logic.

## File Upload Pattern
```go
// Backend: Parse multipart form
r.ParseMultipartForm(10 << 20) // 10MB limit
file, handler, err := r.FormFile("imgOrgif")
// Save to public/img/posts/ with UUID naming
```

## Key Files to Read First
- `backend/web/connectWeb.go` - All routes defined here
- `backend/pkg/apis/chat/chatHub.go` - WebSocket hub logic
- `frontend-next/contexts/WebSocketContext.js` - Real-time event system
- `frontend-next/hooks/useSession.js` - Auth state management
- `WEBSOCKET_ARCHITECTURE.md` - Real-time flow diagrams

## Documentation
See project docs for detailed fixes:
- `WEBSOCKET_ARCHITECTURE.md` - Real-time system design
- `WEBSOCKET_FIX_SUMMARY.md` - Common issues and solutions
- `groups.md` - Group feature implementation notes
