import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function GroupChat({ groupId, user, isOpen, onClose }) {
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  
  // Debug user object to check field names
  console.log('👤 GroupChat user object:', user);
  console.log('👤 user?.id:', user?.id, 'user?.userID:', user?.userID);
  
  // Try different possible field names for user ID
  const userId = user?.id || user?.userID || user?.user_id;
  console.log('👤 Final userId for WebSocket:', userId);
  
  const { sendMessage, messages, connected } = useWebSocket(userId);
  const chatWindowRef = useRef(null);

  // Filter messages for this specific group
  useEffect(() => {
    if (groupId && messages) {
      console.log('🔍 Filtering messages for groupId:', groupId, 'Total messages:', messages.length);
      const filteredMessages = messages.filter(msg => {
        console.log('📩 Message:', msg);
        return msg.type === 'group_message' && msg.group_id === parseInt(groupId);
      });
      console.log('✅ Filtered messages for group:', filteredMessages);
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
      from: userId, // Use the consistent userId we defined above
      content: messageInput.trim(),
      timestamp: new Date().toISOString()
    };
    
    if (sendMessage(messageData)) {
      setMessageInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content" style={{maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'}}>
        {/* Header */}
        <div className="chat-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid #e4e6ea',
          paddingBottom: '12px'
        }}>
          <h3 style={{fontSize: '18px', fontWeight: '500', color: '#1c1e21'}}>Group Chat</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span 
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connected ? '#42b883' : '#e0245e'
              }}
            ></span>
            <span style={{fontSize: '12px', color: '#65676b'}}>{connected ? 'Connected' : 'Disconnected'}</span>
            <button 
              onClick={onClose}
              className="close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={chatWindowRef}
          className="group-chat-window"
        >
          {groupMessages.length === 0 ? (
            <div style={{textAlign: 'center', color: '#65676b', padding: '32px'}}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            groupMessages.map((msg, index) => (
              <div
                key={index}
                className={`group-chat-message ${msg.from === user.id ? 'my-message' : 'other-message'}`}
              >
                <div className="bubble">
                  {msg.from !== user.id && (
                    <div className="meta">
                      <span style={{fontWeight: '500'}}>{msg.fromName || `User ${msg.from}`}</span>
                    </div>
                  )}
                  <div className="text">{msg.message}</div>
                  <div className="meta" style={{justifyContent: msg.from === user.id ? 'flex-end' : 'flex-start'}}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} style={{display: 'flex', gap: '8px'}}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={connected ? "Type your message..." : "Connecting..."}
            disabled={!connected}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #dddfe2',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: !connected ? '#f0f0f0' : 'white'
            }}
          />
          <button
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="btn btn-primary"
            style={{
              backgroundColor: (!connected || !messageInput.trim()) ? '#bec3c9' : '#4267B2'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}