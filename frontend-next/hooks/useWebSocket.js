import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (userID) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  const connectWebSocket = useCallback((userId) => {
    // Temporarily disable WebSocket due to connection issues
    console.log('WebSocket temporarily disabled to fix profile functionality');
    return;
    
    if (!userId || socketRef.current) return;

    try {
      // Use the backend URL directly for WebSocket since it can't go through Next.js proxy
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.hostname}/ws?userID=${userId}`
        : `ws://localhost:8080/ws?userID=${userId}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        setConnected(true);
        setSocket(ws);
        socketRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          switch (data.type) {
            case 'user_list':
              setOnlineUsers(data.users || []);
              break;
            case 'private_message':
              setMessages(prev => [...prev, {
                id: Date.now(),
                from: data.from,
                to: data.to,
                message: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                fromName: data.fromName,
                type: 'private'
              }]);
              break;
            case 'group_message':
              setMessages(prev => [...prev, {
                id: Date.now(),
                from: data.from,
                groupId: data.group_id,
                message: data.content,
                timestamp: data.timestamp || new Date().toISOString(),
                fromName: data.fromName,
                type: 'group'
              }]);
              break;
            case 'notification':
              // Handle notifications
              console.log('Notification received:', data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setConnected(false);
        setSocket(null);
        socketRef.current = null;
        
        // Attempt to reconnect after 3 seconds if it wasn't intentional
        if (event.code !== 1000 && userId) {
          setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket(userId);
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, []);

  const sendMessage = useCallback((messageData) => {
    if (socketRef.current && connected) {
      try {
        socketRef.current.send(JSON.stringify(messageData));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }, [connected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close(1000, 'User initiated disconnect');
    }
  }, []);

  // Connect when userID is available
  useEffect(() => {
    if (userID && !socketRef.current) {
      connectWebSocket(userID);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userID, connectWebSocket]);

  return {
    socket,
    connected,
    messages,
    onlineUsers,
    sendMessage,
    disconnect,
    reconnect: () => connectWebSocket(userID)
  };
};