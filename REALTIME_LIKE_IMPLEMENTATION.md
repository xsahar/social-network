# Real-Time Like/Dislike Updates Implementation

## Summary
Implemented real-time WebSocket broadcasting for post and comment like/dislike actions, so all connected users see like counts update instantly without page refresh.

## Changes Made

### Backend Changes

#### 1. `backend/pkg/apis/like/http.go`
- **Added imports**: `time` and `socialnetwork/pkg/apis/chat`
- **Modified `LikesController` struct**: Added `hub *chat.Hub` field
- **Modified `NewLikesController`**: Now accepts `hub *chat.Hub` parameter
- **Updated `LikeDislikePost` method**: After updating like counts, broadcasts `new_postLike` message to all connected clients with:
  - `type: "new_postLike"`
  - `post_id`: The post that was liked/disliked
  - `likes_count`: Updated likes count
  - `dislikes_count`: Updated dislikes count
- **Updated `InteractWithComment` method**: After updating comment like counts, broadcasts `new_commentLike` message with similar data structure

#### 2. `backend/web/connectWeb.go`
- **Modified likes controller initialization**: Now passes `chatHub` to `NewLikesController`
  ```go
  likesController := like.NewLikesController(*likesService, chatHub)
  ```

### Frontend Changes

#### 3. `frontend-next/pages/posts.js`
- **Updated WebSocket listener**: Changed from reading `message.post_id` directly to parsing JSON from `message.content`
- Now properly extracts `post_id`, `likes_count`, and `dislikes_count` from the broadcasted message
- Updates post list in real-time when any user likes/dislikes a post

#### 4. `frontend-next/pages/comments.js`
- **Added new WebSocket listener**: Listens for `new_commentLike` messages
- Parses like data from `message.content`
- Updates comment like counts in real-time without refreshing

## How It Works

### Post Like Flow:
```
User A likes a post
    ↓
POST /likeDislikePost
    ↓
Backend updates database
    ↓
Backend broadcasts WebSocket message:
{
  type: "new_postLike",
  from: userA_ID,
  post_id: 123,
  content: '{"post_id":123,"likes_count":5,"dislikes_count":1}'
}
    ↓
All connected users receive message
    ↓
Frontend parses content and updates UI
    ↓
User B sees updated like count instantly
```

### Comment Like Flow:
Similar to post likes but with `type: "new_commentLike"` and `comment_id`.

## Testing
To test the implementation:

1. Open the application in two different browsers/tabs
2. Log in as different users in each tab
3. Go to the posts page in both tabs
4. Like/dislike a post in one tab
5. **Expected**: The like count updates immediately in the other tab without refresh
6. Open a post's comments in both tabs
7. Like/dislike a comment in one tab
8. **Expected**: The comment like count updates immediately in the other tab

## Technical Details

- **Message Format**: Like counts are sent as JSON string in the `content` field for consistency with other real-time features
- **Broadcasting**: Uses the existing WebSocket hub's broadcast mechanism
- **Performance**: Non-blocking sends with `select/default` to prevent slow clients from blocking others
- **Error Handling**: JSON parse errors are caught and logged on the frontend

## Consistency with Existing Patterns

This implementation follows the same patterns used for:
- `new_post` broadcasts (when creating posts)
- `new_comment` broadcasts (when adding comments)
- `new_groupPost` broadcasts (for group posts)

All real-time updates now use the same architecture: Backend → WebSocket Hub → All Clients → UI Update
