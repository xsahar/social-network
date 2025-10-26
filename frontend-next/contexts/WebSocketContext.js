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
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Message received:', data);
        
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
            setMessages(prev => [...prev, data]);
            break;
            
          // Treat these as visible notifications (not private messages)
          case 'new_post':
          case 'new_comment':
          case 'new_groupPost':
          case 'new_groupEvent':
          case 'group_invitation':
          case 'new_group_created':
          case 'group_post_comment':
          case 'group_post_like_update':
          case 'group_member_update':
          case 'group_join_request':
          case 'join_request_sent':
          case 'invitation_response':
          case 'new_follower':
          case 'follow_request':
          case 'follow_request_response':
          case 'group_event_vote_update':
            setNotifications(prev => [...prev, data]);
            break;
            
          case 'group_message':
            setMessages(prev => [...prev, data]);
            break;
            
          default:
            setMessages(prev => [...prev, data]);
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
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
