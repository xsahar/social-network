import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (userID) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  const connectWebSocket = useCallback((userId) => {
    console.log('[useWebSocket] connectWebSocket called with userId:', userId);
    
    // For testing, try with a hardcoded user ID if none provided
    const testUserId = userId || 1;
    console.log('[useWebSocket] Using userId for connection:', testUserId);

    // Prevent duplicate connections
    if (socketRef.current && (
      socketRef.current.readyState === WebSocket.CONNECTING || 
      socketRef.current.readyState === WebSocket.OPEN
    )) {
      console.log('[useWebSocket] Connection already exists, skipping');
      return;
    }

    // Clean up existing connection if any
    if (socketRef.current) {
      console.log('[useWebSocket] Closing existing connection');
      socketRef.current.close();
    }

    const url = `ws://localhost:8080/ws?user_id=${testUserId}`;
    console.log('[useWebSocket] Attempting to connect to:', url);
    
    const newSocket = new WebSocket(url);
    
    newSocket.onopen = (event) => {
      console.log('[useWebSocket] WebSocket connected successfully:', event);
      console.log('[useWebSocket] Connection readyState:', newSocket.readyState);
      console.log('[useWebSocket] Connection URL:', newSocket.url);
      console.log('[useWebSocket] Connection protocol:', newSocket.protocol);
      setConnected(true);
      
      // Send a test message immediately after connecting to keep connection alive
      setTimeout(() => {
        if (newSocket.readyState === WebSocket.OPEN) {
          console.log('[useWebSocket] Sending keepalive ping...');
          newSocket.send(JSON.stringify({ type: 'ping', from: testUserId }));
        }
      }, 100);
    };
    
    newSocket.onclose = (event) => {
      console.log('[useWebSocket] WebSocket closed. Code:', event.code, 'Reason:', event.reason, 'URL:', event.target?.url);
      console.log('[useWebSocket] wasClean:', event.wasClean);
      setConnected(false);
      
      // Don't auto-reconnect to prevent infinite loops
      console.log('[useWebSocket] Auto-reconnect disabled');
    };
    
    newSocket.onerror = (event) => {
      console.error('[useWebSocket] WebSocket error:', event);
      console.error('[useWebSocket] Error target:', event.target);
      setConnected(false);
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[useWebSocket] Message received:', data);
        setMessages(prev => [...prev, data]);
      } catch (error) {
        console.error('[useWebSocket] Failed to parse message:', error);
      }
    };

    // Save socket to ref and state
    socketRef.current = newSocket;
    setSocket(newSocket);
  }, []);

  const sendMessage = useCallback((messageData) => {
    console.log('[useWebSocket] Attempting to send message:', messageData);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(messageData));
        console.log('[useWebSocket] Message sent successfully');
        return true;
      } catch (error) {
        console.error('[useWebSocket] Failed to send message:', error);
        return false;
      }
    } else {
      console.error('[useWebSocket] Cannot send message - WebSocket not connected');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[useWebSocket] Manual disconnect called');
    if (socketRef.current) {
      socketRef.current.close(1000, 'User initiated disconnect');
    }
  }, []);

  // Connect when userID is available
  useEffect(() => {
    if (userID && (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
      console.log('[useWebSocket] Auto-connecting with userID:', userID);
      connectWebSocket(userID);
    }
    
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log('[useWebSocket] Cleanup: closing WebSocket');
        socketRef.current.close();
      }
    };
  }, [userID]); // Remove connectWebSocket from deps to prevent loops

  return {
    socket,
    connected,
    messages,
    onlineUsers,
    sendMessage,
    disconnect,
    connectWebSocket,
    reconnect: () => connectWebSocket(userID)
  };
};