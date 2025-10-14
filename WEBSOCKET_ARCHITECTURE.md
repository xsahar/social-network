# WebSocket Real-Time Architecture

## Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              _app.js (WebSocketProvider)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  const ws = new WebSocket('ws://localhost:8080/ws?user_id=4') │
│  │  Single connection for entire app session                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WebSocketContext                                │
│  - Manages connection state                                      │
│  - Broadcasts messages to subscribers                            │
│  - Handles reconnection                                          │
└──────┬──────────┬────────────┬────────────┬─────────────────────┘
       │          │            │            │
       ▼          ▼            ▼            ▼
   ┌──────┐  ┌──────┐    ┌──────┐    ┌──────┐
   │Posts │  │Groups│    │Group │    │Group │
   │ Page │  │ Page │    │Posts │    │Events│
   └──────┘  └──────┘    └──────┘    └──────┘
     │          │            │            │
     │ subscribe() each listen for specific message types
     │          │            │            │
     ▼          ▼            ▼            ▼
```

## Message Types & Handlers

### Before Fix ❌
```
Backend Sends:                  Frontend Listens:
┌──────────────────┐           ┌──────────────────┐
│ new_post         │────────── │ Posts Page ✅    │
│ new_postLike     │────────── │ Posts Page ✅    │
│ new_comment      │────────── │ Comments ✅      │
│ new_groupPost    │─────╳─────│ GroupPosts ❌    │  <-- NOT LISTENING!
│ new_groupEvent   │─────╳─────│ GroupEvents ❌   │  <-- NOT LISTENING!
│ group_message    │────────── │ GroupChat ✅     │
└──────────────────┘           └──────────────────┘
```

### After Fix ✅
```
Backend Sends:                  Frontend Listens:
┌──────────────────┐           ┌──────────────────┐
│ new_post         │────────── │ Posts Page ✅    │
│ new_postLike     │────────── │ Posts Page ✅    │
│ new_comment      │────────── │ Comments ✅      │
│ new_groupPost    │────────── │ GroupPosts ✅    │  <-- NOW LISTENING!
│ new_groupEvent   │────────── │ GroupEvents ✅   │  <-- NOW LISTENING!
│ group_message    │────────── │ GroupChat ✅     │
└──────────────────┘           └──────────────────┘
```

## Real-Time Update Flow Example

### Scenario: User A creates a new group post

```
User A (Tab 1)                                      User B (Tab 2)
─────────────────────────────────────────────────────────────────

1. Click "Create Post"
   └─► POST /groups/create-post
       │
       ▼
   Backend receives request
       │
       ├─► Insert into database ✅
       │
       └─► Broadcast WebSocket message:
           {
             type: "new_groupPost",
             from: userA_ID,
             group_id: 123,
             content: "Hello Group!"
           }
           │
           ├─────────────────────────┐
           │                         │
           ▼                         ▼
   WebSocketContext          WebSocketContext
   (User A)                  (User B)
           │                         │
           ▼                         ▼
   subscribe() fires         subscribe() fires
   in GroupPostsSection      in GroupPostsSection
           │                         │
           ▼                         ▼
   fetchGroupPosts()         fetchGroupPosts()
           │                         │
           ▼                         ▼
   UI Updates ✅                UI Updates ✅
   See new post              See new post (REAL-TIME!)
```

## Code Pattern Used (Consistent Across All Pages)

```javascript
// Pattern used in all real-time components
useEffect(() => {
  if (!user || !identifier) return;

  const unsubscribe = subscribe((message) => {
    // Filter for relevant messages
    if (message.type === 'expected_type' && message.id === identifier) {
      // Refresh data
      fetchData();
    }
  });

  // Cleanup on unmount
  return () => unsubscribe();
}, [user, identifier, subscribe]);
```

## Benefits of This Architecture

1. **Single WebSocket Connection**
   - No multiple connections per page
   - Efficient resource usage
   - Automatic reconnection handled centrally

2. **Pub/Sub Pattern**
   - Components subscribe to messages they care about
   - Easy to add new real-time features
   - Clean separation of concerns

3. **No Polling**
   - No setTimeout/setInterval needed
   - Instant updates
   - Lower server load

4. **Consistent Pattern**
   - Same code structure across all pages
   - Easy to maintain and debug
   - Clear message flow

## WebSocket Message Types Reference

| Type | Sender | Receivers | Trigger |
|------|--------|-----------|---------|
| `new_post` | Backend | All online users | New post created |
| `new_postLike` | Backend | All online users | Post liked/unliked |
| `new_comment` | Backend | All online users | Comment added |
| `new_groupPost` | Backend | Group members | Group post created |
| `new_groupEvent` | Backend | Group members | Group event created |
| `group_message` | Backend | Group members | Group chat message |
| `online_users` | Backend | All connected | User connects/disconnects |
| `typing` | User | Specific user | User typing in chat |

## Performance Considerations

- Messages are filtered client-side (by type and ID)
- Only relevant components refresh their data
- Non-blocking send operations (select with default case)
- Automatic cleanup on component unmount
