import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function GroupChat({ groupId, user, isOpen, onClose }) {
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const { sendMessage, messages, connected } = useWebSocket(user?.id);
  const chatWindowRef = useRef(null);

  // Filter messages for this specific group
  useEffect(() => {
    if (groupId && messages) {
      const filteredMessages = messages.filter(msg => 
        msg.type === 'group' && msg.groupId === parseInt(groupId)
      );
      setGroupMessages(filteredMessages);
    }
  }, [messages, groupId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [groupMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !connected) return;
    
    const messageData = {
      type: 'group_message',
      group_id: parseInt(groupId),
      from: user.id,
      content: messageInput.trim(),
      timestamp: new Date().toISOString()
    };
    
    if (sendMessage(messageData)) {
      setMessageInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-medium text-gray-900">Group Chat</h3>
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-semibold ml-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={chatWindowRef}
          className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-[300px] max-h-[400px] border rounded p-3 bg-gray-50"
        >
          {groupMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            groupMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.from === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.from === user.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 border'
                  }`}
                >
                  {msg.from !== user.id && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {msg.fromName || `User ${msg.from}`}
                    </div>
                  )}
                  <div>{msg.message}</div>
                  <div className={`text-xs mt-1 opacity-75 ${
                    msg.from === user.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={connected ? "Type your message..." : "Connecting..."}
            disabled={!connected}
            className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}