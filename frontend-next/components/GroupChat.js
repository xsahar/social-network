import { useState, useEffect, useRef } from 'react';

export default function GroupChat({ groupId, user, isOpen, onClose, connected, messages, sendMessage }) {
  const [messageInput, setMessageInput] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const [existingMessages, setExistingMessages] = useState([]);
  const chatWindowRef = useRef(null);
  const inputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [EmojiPicker, setEmojiPicker] = useState(null);

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

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!showEmojiPicker) return;
      const picker = document.getElementById('group-emoji-picker');
      const button = document.getElementById('group-emoji-button');
      if (picker && !picker.contains(e.target) && button && !button.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showEmojiPicker]);

  // Dynamically load emoji-picker-react on first open
  useEffect(() => {
    let mounted = true;
    if (showEmojiPicker && !EmojiPicker) {
      (async () => {
        try {
          const mod = await import('emoji-picker-react');
          if (mounted) setEmojiPicker(() => mod.default || mod);
        } catch (err) {
          console.error('Failed to load emoji picker-react:', err);
        }
      })();
    }
    return () => { mounted = false; };
  }, [showEmojiPicker, EmojiPicker]);

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
      // optimistic append so emoji appears immediately
      setGroupMessages(prev => {
        const updated = [...prev, messageData];
        return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });
      setMessageInput('');
    }
  };

  const insertAtCaret = (text) => {
    const input = inputRef.current;
    if (!input) {
      setMessageInput(prev => prev + text);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newVal = input.value.slice(0, start) + text + input.value.slice(end);
    setMessageInput(newVal);
    setTimeout(() => {
      const pos = start + text.length;
      input.focus();
      try { input.setSelectionRange(pos, pos); } catch (err) {}
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: '64px',
      width: '350px',
      height: 'calc(100vh - 64px)',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999
    }}>
      {/* Chat Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px',
        borderBottom: '1px solid #e4e6ea',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{fontSize: '18px', fontWeight: '500', color: '#1c1e21', margin: 0}}>
          Group Chat
        </h3>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: connected ? '#42b883' : '#e0245e' 
            }}></span>
            <span style={{fontSize: '12px', color: '#65676b'}}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer', 
              color: '#65676b',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div 
        ref={chatWindowRef} 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px',
          backgroundColor: '#f8f9fa'
        }}
      >
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

        {/* Chat Input */}
        <form 
          onSubmit={handleSendMessage} 
          style={{
            padding: '16px',
            borderTop: '1px solid #e4e6ea',
            backgroundColor: 'white',
            display: 'flex',
            gap: '8px'
          }}
        >
            <input
              type="text"
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={connected ? "Type your message..." : "Connecting..."}
              disabled={!connected}
              style={{ 
                flex: 1, 
                padding: '10px 12px', 
                border: '1px solid #dddfe2', 
                borderRadius: '20px', 
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <button
                id="group-emoji-button"
                type="button"
                onClick={() => setShowEmojiPicker(s => !s)}
                title="Insert emoji"
                disabled={!connected}
                style={{
                  padding: '8px 12px',
                  background: !connected ? '#f3f4f6' : 'none',
                  border: '1px solid #dddfe2',
                  borderRadius: '20px',
                  cursor: !connected ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  lineHeight: 1
                }}
              >
                🙂
              </button>

              {showEmojiPicker && (
                <div id="group-emoji-picker" style={{
                  position: 'absolute',
                  bottom: '52px',
                  right: 0,
                  width: '320px',
                  background: 'white',
                  border: '1px solid #e4e6ea',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  borderRadius: '8px',
                  padding: '8px',
                  zIndex: 1000
                }}>
                  {EmojiPicker ? (
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        const char = emojiData?.emoji || '';
                        insertAtCaret(char);
                        setShowEmojiPicker(false);
                      }}
                      preload={true}
                    />
                  ) : (
                    <div style={{padding: 12}}>Loading emojis…</div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={!connected || !messageInput.trim()}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: connected && messageInput.trim() ? '#4267B2' : '#e4e6ea', 
                  color: connected && messageInput.trim() ? 'white' : '#65676b', 
                  border: 'none', 
                  borderRadius: '20px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: connected && messageInput.trim() ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap'
                }}
              >
                Send
              </button>
            </div>
        </form>
      </div>
    );
  }
  
  