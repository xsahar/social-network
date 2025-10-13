import { useState, useEffect, useRef } from 'react';

export default function GroupChat({ groupId, user, isOpen, onClose, connected, messages, sendMessage }) {
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const [existingMessages, setExistingMessages] = useState([]);
  const chatWindowRef = useRef(null);

  const userId = user?.id || user?.userID || user?.user_id;

  // Load existing messages when chat opens
  useEffect(() => {
    if (isOpen && groupId) {
      console.log('🔄 Loading messages for group:', groupId);
      fetch(`/api/group-messages?group_id=${groupId}`, { credentials: 'include' })
        .then(res => {
          console.log('📡 API response status:', res.status);
          if (res.status === 304) {
            console.log('📡 304 Not Modified - trying to parse anyway');
            return res.text().then(text => text ? JSON.parse(text) : {});
          }
          return res.json();
        })
        .then(data => {
          console.log('📥 Raw data received:', data);
          const messages = data.messages || data || [];
          console.log('📥 Messages to process:', messages);
          const existingMessages = messages.map(msg => ({
            ...msg,
            type: 'group_message',
            group_id: parseInt(groupId),
            timestamp: msg.created_at || msg.timestamp
          }));
          console.log('✅ Mapped existing messages:', existingMessages);
          // Sort by timestamp (oldest first) for consistent chat order
          const sortedMessages = existingMessages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          console.log('✅ Setting sorted messages:', sortedMessages);
          setGroupMessages(sortedMessages);
        })
        .catch(error => {
          console.error('❌ Error loading messages:', error);
          setGroupMessages([]);
        });
    }
  }, [isOpen, groupId]);  // Add new real-time messages to existing ones
  useEffect(() => {
    if (groupId && messages) {
      const newMessages = messages.filter(msg =>
        msg.type === 'group_message' && msg.group_id === parseInt(groupId)
      );
      
      if (newMessages.length > 0) {
        setGroupMessages(prev => {
          const combined = [...prev, ...newMessages];
          // Remove duplicates and sort by timestamp
          const unique = combined.filter((msg, index, arr) => 
            index === arr.findIndex(m => 
              m.content === msg.content && 
              m.from === msg.from && 
              Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000
            )
          );
          return unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      }
    }
  }, [messages, groupId]);

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
      from: userId,
      username: user?.username || `User ${userId}`,
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
        <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e4e6ea', paddingBottom: '12px' }}>
          <h3 style={{fontSize: '18px', fontWeight: '500', color: '#1c1e21'}}>Group Chat</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connected ? '#42b883' : '#e0245e' }}></span>
            <span style={{fontSize: '12px', color: '#65676b'}}>{connected ? 'Connected' : 'Disconnected'}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#65676b' }}>×</button>
          </div>
        </div>
        
        <div ref={chatWindowRef} style={{ flex: 1, overflowY: 'auto', padding: '8px', maxHeight: '400px', border: '1px solid #e4e6ea', borderRadius: '6px', marginBottom: '12px' }} className="group-chat-window">
          {groupMessages.length === 0 ? (
            <div style={{textAlign: 'center', color: '#65676b', padding: '32px'}}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            groupMessages.map((msg, index) => (
              <div key={index} className={`group-chat-message ${msg.from === userId ? 'my-message' : 'other-message'}`}>
                <div className="bubble">
                  {msg.from !== userId && (
                    <div className="meta">
                      <span style={{fontWeight: '500'}}>{msg.username || `User ${msg.from}`}</span>
                    </div>
                  )}
                  <div className="text">{msg.content}</div>
                  <div className="meta" style={{justifyContent: msg.from === userId ? 'flex-end' : 'flex-start'}}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} style={{display: 'flex', gap: '8px'}}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={connected ? "Type your message..." : "Connecting..."}
            disabled={!connected}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #dddfe2', borderRadius: '6px', fontSize: '14px' }}
          />
          <button 
            type="submit"
            disabled={!connected || !messageInput.trim()}
            style={{ padding: '8px 16px', backgroundColor: connected && messageInput.trim() ? '#4267B2' : '#e4e6ea', color: connected && messageInput.trim() ? 'white' : '#65676b', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: connected && messageInput.trim() ? 'pointer' : 'not-allowed' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
