import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children, userID }) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  const messageListenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  // Subscribe to specific message types
  const subscribe = useCallback((listener) => {
    messageListenersRef.current.add(listener);
    return () => {
      messageListenersRef.current.delete(listener);
    };
  }, []);

  // Broadcast messages to all listeners
  const notifyListeners = useCallback((message) => {
    messageListenersRef.current.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('[WebSocket] Listener error:', error);
      }
    });
  }, []);

  // Allow other components to emit a local (client-side) message that will be
  // dispatched to all subscribers. This is useful for optimistic UI updates
  // when the server will broadcast the same event but the local client should
  // react immediately without waiting for a round-trip.
  const emitLocalMessage = useCallback((message) => {
    try {
      // append to messages for historical UI if appropriate
      setMessages(prev => [...prev, message]);
    } catch (err) {
      // ignore
    }
    try {
      notifyListeners(message);
    } catch (err) {
      console.error('[WebSocket] emitLocalMessage failed', err);
    }
  }, [notifyListeners]);

  const connectWebSocket = useCallback((userId) => {
    if (!userId) {
      console.log('[WebSocket] No userID provided, skipping connection');
      return;
    }

    // Prevent duplicate connections - check if already connected
    if (socketRef.current) {
      const state = socketRef.current.readyState;
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected or connecting, skipping');
        return;
      }
      // Close stale connection
      socketRef.current.close();
    }

    const url = `ws://localhost:8080/ws?user_id=${userId}`;
    console.log('[WebSocket] Connecting to:', url);
    
      const socket = new WebSocket(url);
    
    socket.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      setConnected(true);
      
      // Request online users list
      setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'get_online_users' }));
        }
      }, 100);
    };
    
    socket.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      setConnected(false);
      socketRef.current = null; // Clear the ref
      
      // Auto-reconnect after 3 seconds if still have userId
      if (userId && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          reconnectTimeoutRef.current = null;
          connectWebSocket(userId);
        }, 3000);
      }
    };
    
    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        console.log('[WebSocket] Raw message received:', raw);

        // Normalize common fields so downstream components don't have to
        const data = {
          ...raw,
          type: raw.type || raw.Type,
          group_id: raw.group_id || raw.groupId || raw.GroupID || raw.group || raw.Group,
          from: raw.from || raw.From || raw.user_id || raw.userId || raw.FromUser || raw.sender || raw.From,
          content: raw.content || raw.Content || raw.message || raw.Message || raw.ContentText,
        };

        // Normalize timestamp: prefer several possible fields and fall back to now
        const tsCandidates = [raw.timestamp, raw.Timestamp, raw.time, raw.Time, raw.created_at, raw.createdAt];
        let parsedTS = null;
        for (const t of tsCandidates) {
          if (!t) continue;
          const p = Date.parse(t);
          if (!isNaN(p)) { parsedTS = p; break; }
        }
        if (!parsedTS && raw.Timestamp && typeof raw.Timestamp === 'number') parsedTS = raw.Timestamp;
        if (!parsedTS && raw.ts && typeof raw.ts === 'number') parsedTS = raw.ts;
        if (!parsedTS) parsedTS = Date.now();
        data.timestamp = new Date(parsedTS).toISOString();

        console.log('[WebSocket] Normalized message:', data);
        
        // Handle different message types
  switch (data.type) {
          case 'online_users':
            setOnlineUsers(data.users || []);
            break;
            
          case 'user_connected':
          case 'user_disconnected':
            // Update online users list
            if (data.users) {
              setOnlineUsers(data.users);
            }
            break;
            
          case 'private_message':
          case 'message':
            // Private/chat messages are stored separately
            // Avoid duplicates: compare from/content and timestamp proximity (3s)
            setMessages(prev => {
              try {
                const isDup = prev.some(m => {
                  if (!m || !m.content) return false;
                  if (m.type !== data.type) return false;
                  if (m.from !== data.from) return false;
                  if (m.content !== data.content) return false;
                  const t1 = new Date(m.timestamp || m.Timestamp || Date.now()).getTime();
                  const t2 = new Date(data.timestamp || data.Timestamp || Date.now()).getTime();
                  return Math.abs(t1 - t2) < 3000; // 3 seconds
                });
                if (isDup) return prev;
              } catch (err) {
                // fallback: append if detection fails
              }
              return [...prev, data];
            });
            break;
            
          // Treat only the allowed types as visible notifications (not private messages).
          // Disabled other notification types for now per product request.
          // Allowed notification types (plus follow responses/new follower so updates appear in real-time):
          // - follow_request: when a user with a private profile receives a follow request
          // - follow_request_response: when a follow request is accepted/declined (show response)
          // - new_follower: when someone follows a public profile
          // - group_invitation: when a user is invited to a group
          // - group_join_request: when a user requests to join a group (for group creators)
          // - new_groupEvent: when a group event is created (for group members)
          case 'follow_request':
          case 'follow_request_response':
          case 'new_follower':
          case 'group_invitation':
          case 'group_join_request':
          case 'new_groupEvent':
            setNotifications(prev => {
              try {
                const exists = (prev || []).some(item => {
                  if (!item) return false;
                  // match by invitation/request id when available
                  const iid = item.InvitationID || item.invitation_id || item.invitationId || item.id;
                  const did = data.InvitationID || data.invitation_id || data.invitationId || data.id;
                  if (iid && did && String(iid) === String(did)) return true;
                  // match by group id + from/inviter
                  const gidA = item.GroupID || item.group_id || item.groupId || item.group;
                  const gidB = data.GroupID || data.group_id || data.groupId || data.group;
                  const fromA = item.From || item.from || item.inviter_id || item.inviterId;
                  const fromB = data.From || data.from || data.inviter_id || data.inviterId;
                  if (gidA && gidB && String(gidA) === String(gidB) && fromA && fromB && String(fromA) === String(fromB)) return true;
                  // fallback: same type and content
                  if (item.type === data.type && (item.content === data.content || item.Content === data.Content)) return true;
                  return false;
                });
                if (exists) return prev || [];
              } catch (err) {}
              return [...(prev || []), data];
            });
            break;
            
          case 'group_message':
            // Group messages — dedupe similar to private messages
            setMessages(prev => {
              try {
                const isDup = prev.some(m => {
                  if (!m || !m.content) return false;
                  if (m.type !== data.type) return false;
                  if ((m.group_id || m.GroupID) !== (data.group_id || data.GroupID)) return false;
                  if (m.from !== data.from) return false;
                  if (m.content !== data.content) return false;
                  // Only treat as duplicate if timestamps are exactly equal (ms precision).
                  const t1 = new Date(m.timestamp || m.Timestamp || Date.now()).getTime();
                  const t2 = new Date(data.timestamp || data.Timestamp || Date.now()).getTime();
                  const exactEqual = t1 === t2;
                  if (exactEqual) {
                    console.log('[WebSocket] Duplicate suppressed (exact timestamp match):', { m, data });
                  }
                  return exactEqual;
                });
                if (isDup) return prev;
              } catch (err) {}
              console.log('[WebSocket] Appending group_message to messages:', data);
              return [...prev, data];
            });
            break;
            
          default:
            // For other types we still append but try to avoid simple duplicates
            setMessages(prev => {
              try {
                const isDup = prev.some(m => m && m.type === data.type && m.from === data.from && m.content === data.content);
                if (isDup) return prev;
              } catch (err) {}
              return [...prev, data];
            });
        }
        
        // Notify all subscribers
        notifyListeners(data);
        
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    socketRef.current = socket;
  }, [notifyListeners]);

  const sendMessage = useCallback((messageData) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(messageData));
        console.log('[WebSocket] Message sent:', messageData);
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        return false;
      }
    } else {
      console.error('[WebSocket] Cannot send message - not connected');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close(1000, 'User logout');
      socketRef.current = null;
    }
    setConnected(false);
    setMessages([]);
    setOnlineUsers([]);
    setNotifications([]);
  }, []);

  // Connect when userID changes - ONLY ONCE per userID
  useEffect(() => {
    if (!userID) {
      console.log('[WebSocketProvider] No userID, skipping connection');
      return;
    }

    // Check if already connected for this user
    if (socketRef.current) {
      const state = socketRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log('[WebSocketProvider] Already connected, skipping');
        return;
      }
    }

    console.log('[WebSocketProvider] Connecting for userID:', userID);
    connectWebSocket(userID);
    
    return () => {
      // Only clear reconnect timeout, don't close connection on component updates
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [userID, connectWebSocket]); // Keep connectWebSocket for initial connection only

  const value = {
    connected,
    messages,
    onlineUsers,
    notifications,
    sendMessage,
    disconnect,
    reconnect: () => connectWebSocket(userID),
    subscribe,
    // Clear all notifications (client-side)
    clearNotifications: () => setNotifications([]),
    // Setter exposed if needed by components
    setNotifications
    ,
    // Emit a synthetic/local message to all subscribers (optimistic updates)
    emitLocalMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
