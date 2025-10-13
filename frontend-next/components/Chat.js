import { useState, useRef, useEffect } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const Chat = ({ isOpen, onClose, chatWith, userID }) => {
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const { sendMessage, subscribe } = useWebSocketContext();
  const chatWindowRef = useRef(null);

  // Filter and listen for messages for this specific chat
  useEffect(() => {
    if (!chatWith || !userID) return;

    const unsubscribe = subscribe((message) => {
      // Only handle private messages
      if (message.type === 'private_message' || message.type === 'message') {
        // Check if message is between current user and chat partner
        if (
          (message.from === userID && message.to === chatWith.id) || 
          (message.from === chatWith.id && message.to === userID)
        ) {
          setChatMessages(prev => {
            // Avoid duplicates
            const isDuplicate = prev.some(msg => 
              msg.timestamp === message.timestamp && 
              msg.content === message.content &&
              msg.from === message.from
            );
            if (isDuplicate) return prev;
            return [...prev, message];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [chatWith, userID, subscribe]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !chatWith) return;

    const messageData = {
      type: 'private_message',
      from: userID,
      to: chatWith.id,
      content: messageInput,
      timestamp: new Date().toISOString()
    };

    const success = sendMessage(messageData);
    
    if (success) {
      // Add message to local chat immediately for better UX
      setChatMessages(prev => [...prev, {
        ...messageData,
        username: 'You'
      }]);
      setMessageInput('');
    } else {
      alert('Failed to send message. Please check your connection.');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col">
      {/* Chat Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">Chat with {chatWith?.username || 'User'}</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatWindowRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <div
              key={`${msg.timestamp}-${index}`}
              className={`flex ${msg.from === userID ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex flex-col max-w-xs">
                <div 
                  className={`p-2 rounded-lg max-w-xs ${
                    msg.from === userID 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content || msg.message}
                </div>
                <div className={`text-xs text-gray-400 mt-1 ${
                  msg.from === userID ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;