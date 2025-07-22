# Groups Feature Requirements

## Overview
A user must be able to create a group. The group should have a title and a description given by the creator and he/she can invite other users to join the group. The invited users need to accept the invitation to be part of the group. They can also invite other people once they are already part of the group. Another way to enter the group is to request to be in it and only the creator of the group would be allowed to accept or refuse the request.

## Core Requirements

### ✅ Group Creation
- [x] User can create a group with title and description
- [x] Creator becomes the group owner/admin
- [x] Groups are stored in database with proper migrations

### ✅ Group Discovery & Joining
- [x] **Browse all groups section** - Users can find groups by browsing through all available groups
- [x] **Request to join group** - Users can request membership to groups they find
- [x] **Creator approval system** - Only group creator can accept/refuse join requests

### ❌ Group Invitations
- [ ] **Invite users to group** - Creator and existing members can invite other users to join
- [ ] **Invitation acceptance required** - Invited users must accept invitation to join group
- [ ] **Member invitation rights** - Group members can invite others once they join
- [ ] **Invitation notifications** - Users receive notifications for group invitations

### ❌ Group Posts & Comments
- [ ] **Group-specific posts** - Group members can create posts within groups
- [ ] **Group post visibility** - Posts only visible to group members
- [ ] **Group comments** - Members can comment on group posts  
- [ ] **Image/GIF support** - Posts and comments can include images or GIFs
- [ ] **Member-only content** - All posts and comments restricted to group members

### ❌ Group Events
- [ ] **Event creation** - Group members can create events
- [ ] **Event details** - Events must have:
  - Title
  - Description  
  - Day/Time
  - At least 2 options: Going/Not Going (minimum required)
- [ ] **Event RSVP** - Every group member can choose one option for the event
- [ ] **Event visibility** - Events available to all group members
- [ ] **Event notifications** - Members notified when events are created

### ❌ Group Chat
- [ ] **Common chat room** - Groups have a shared chat room for all members
- [ ] **Member-only messaging** - Only group members can send/receive messages
- [ ] **Real-time messaging** - WebSocket implementation for instant messaging
- [ ] **Emoji support** - Users can send emojis in group chat
- [ ] **Chat history** - Messages are stored and retrievable

### ❌ Group Management
- [ ] **Member list** - View all group members
- [ ] **Member permissions** - Different roles (creator vs member)
- [ ] **Leave group** - Members can leave groups
- [ ] **Remove members** - Creator can remove members (optional)

## Database Schema Requirements

### ✅ Tables Created
- [x] `groups` table - Basic group information
- [x] `groupMembers` table - Group membership tracking
- [x] `groupInvitations` table - Pending invitations
- [x] `groupRequests` table - Join requests
- [] `groupPosts` table - Group-specific posts
- [] `groupEvents` table - Group events
- [] `eventResponses` table - RSVP tracking

### ❌ Additional Schema Needs
- [ ] **Group posts table** - Store group-specific posts with member restrictions
- [ ] **Group events table** - Store group events with details and options
- [ ] **Event responses table** - Track member responses to events
- [ ] **Group chat messages table** - Store group chat history
- [ ] **Group notifications table** - Track group-related notifications

## Frontend Implementation Status

### ✅ Completed
- [x] Groups page basic structure (`/groups`)
<!-- - [x] Groups CSS separated into `groups.css` -->
- [x] Create group modal/form
- [x] Tabs for different group views
- [x] Groups grid layout for displaying groups

## Backend Implementation Status

### ✅ Completed
- [x] Group creation API endpoint
- [x] Database migrations for groups
- [x] Basic group models and structures

### ❌ To Be Implemented
- [ ] **Browse groups API** - Get all groups for browsing/discovery
- [ ] **Get user groups API** - Get groups user created or joined
- [ ] **Join request API** - Users can request to join groups
- [ ] **Request approval API** - Group creators can accept/refuse join requests  
- [ ] **Group invitation API** - Creator and members can invite other users
- [ ] **Invitation response API** - Users can accept/refuse group invitations
- [ ] **Group membership API** - Manage group members and permissions
- [ ] **Group posts API** - CRUD operations for group posts (members only)
- [ ] **Group post comments API** - Add/get comments on group posts
- [ ] **Image/GIF upload API** - Handle media uploads for group posts/comments
- [ ] **Group events API** - Create and manage group events
- [ ] **Event RSVP API** - Members can respond to events (Going/Not Going)
- [ ] **Group chat WebSocket** - Real-time group messaging with emoji support
- [ ] **Group notifications API** - Handle invitations, requests, and event notifications

## Priority Implementation Order

### Phase 1: Core Group Functionality (Priority)
1. ✅ **Group discovery system** - Browse all available groups section
2. ✅ **Join request system** - Users can request to join groups they find
3. ✅ **Request approval system** - Group creators accept/refuse join requests
4. ❌ **Group invitation system** - Creator and members can invite other users
5. ❌ **Invitation response system** - Users accept/refuse group invitations

### Phase 2: Group Content & Interaction  
1. ❌ **Group posts and comments** - Members can create posts and comments
2. ❌ **Image/GIF support** - Upload media in group posts and comments
3. ❌ **Member-only visibility** - Content only visible to group members
4. ❌ **Group events system** - Create events with title, description, date/time
5. ❌ **Event RSVP system** - Members choose Going/Not Going options

### Phase 3: Group Communication & Notifications
1. ❌ **Group chat implementation** - Common chat room for all group members
2. ❌ **Real-time messaging** - WebSocket for instant group messaging
3. ❌ **Emoji support** - Send emojis in group chat
4. ❌ **Group notifications** - Invitations, join requests, and event notifications
5. ❌ **Event notifications** - Notify members when events are created

### Phase 4: Polish & Advanced Features
1. ❌ **Enhanced member management** - Advanced group member features
2. ❌ **Chat history** - Persistent group chat message storage
3. ❌ **Performance optimizations** - Efficient queries and caching
4. ❌ **Group search functionality** - Advanced group discovery features

## Technical Considerations

### WebSocket Integration
- [ ] Extend existing WebSocket for group chat
- [ ] Handle multiple group chat rooms
- [ ] Message broadcasting to group members only

### Notification System
- [ ] **Group invitation notifications** - Notify users when invited to groups
- [ ] **Join request notifications** - Notify creators of join requests  
- [ ] **Event creation notifications** - Notify group members when events are created
- [ ] **New group post notifications** - Notify members of new posts (optional)
- [ ] **Invitation acceptance notifications** - Notify when invitations are accepted

### Security & Privacy
- [ ] Verify group membership for all group actions
- [ ] Ensure only group members see group content
- [ ] Validate creator permissions for approvals

### Performance
- [ ] Efficient group member queries
- [ ] Pagination for group posts
- [ ] Caching for frequently accessed groups

## Current Status Summary
- **Overall Progress: ~15%**
- **Database Schema: ~90% Complete**
- **Frontend Structure: ~30% Complete**
- **Backend API: ~20% Complete**
- **Core Functionality: ~10% Complete**

## Next Steps (Based on Project Requirements)
1. ✅ ~~**Implement group browsing section**~~ - COMPLETED
2. ✅ ~~**Build join request system**~~ - COMPLETED  
3. **Create group invitation system** - Creator and members can invite other users  
4. **Build invitation/request approval** - Accept/refuse system for both scenarios
5. **Add group posts with media** - Members create posts/comments with image/GIF support
6. **Implement group events with RSVP** - Create events with Going/Not Going options
7. **Build group chat room** - Common chat for all group members with emoji support
8. **Add comprehensive notifications** - For invitations, requests, events, and activities
9. **Test multi-user scenarios** - Ensure proper functionality across different users
