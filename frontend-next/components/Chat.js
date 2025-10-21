import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const Chat = ({ isOpen, onClose, chatWith, userID }) => {
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { sendMessage, subscribe, connected } = useWebSocketContext();
  const chatWindowRef = useRef(null);
  const inputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [EmojiPicker, setEmojiPicker] = useState(null);

  // Fetch chat history when chat opens
  useEffect(() => {
    if (!chatWith || !isOpen) {
      setChatMessages([]); // Clear messages when chat closes
      return;
    }

    const fetchChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`http://localhost:8080/get-chat-history?user_id=${chatWith.id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          // Sort by timestamp (oldest first)
          const sortedMessages = messages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          setChatMessages(sortedMessages);
        } else if (response.status === 403) {
          setErrorMessage('You can only chat with users you follow or who follow you');
        } else {
          console.error('Failed to fetch chat history');
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [chatWith, isOpen]);

  // Filter and listen for messages for this specific chat
  useEffect(() => {
    if (!chatWith || !userID || !isOpen) return;

    const unsubscribe = subscribe((message) => {
      // Handle error messages
      if (message.type === 'error') {
        setErrorMessage(message.content);
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      // Only handle private messages for this specific chat
      if (message.type === 'private_message' || message.type === 'message') {
        // Check if message is between current user and chat partner
        if (
          (message.from === userID && message.to === chatWith.id) || 
          (message.from === chatWith.id && message.to === userID)
        ) {
          setChatMessages(prev => {
            // Avoid duplicates based on timestamp, content, and sender
            const isDuplicate = prev.some(msg => 
              msg.content === message.content &&
              msg.from === message.from &&
              Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000
            );
            if (isDuplicate) return prev;
            
            // Add new message and sort by timestamp
            const updated = [...prev, message];
            return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
        }
      }
    });

    return () => unsubscribe();
  }, [chatWith, userID, isOpen, subscribe]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!showEmojiPicker) return;
      const picker = document.getElementById('emoji-picker');
      const button = document.getElementById('emoji-button');
      if (picker && !picker.contains(e.target) && button && !button.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showEmojiPicker]);

  // Dynamically load emoji-picker-react on first open to avoid SSR issues
  useEffect(() => {
    let mounted = true;
    if (showEmojiPicker && !EmojiPicker) {
      (async () => {
        try {
          const mod = await import('emoji-picker-react');
          if (mounted) {
            // emoji-picker-react default export is a component
            setEmojiPicker(() => mod.default || mod);
          }
        } catch (err) {
          console.error('Failed to load emoji picker-react:', err);
        }
      })();
    }
    return () => { mounted = false; };
  }, [showEmojiPicker, EmojiPicker]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !chatWith || !connected) return;

    const messageData = {
      type: 'private_message',
      from: userID,
      to: chatWith.id,
      content: messageInput,
      timestamp: new Date().toISOString()
    };

    // Try to send via WebSocket/transport
    const success = sendMessage(messageData);

    if (success) {
      // Optimistically append message so emoji and text appear immediately
      setChatMessages(prev => {
        const updated = [...prev, messageData];
        return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });
      setMessageInput('');
    } else {
      alert('Failed to send message. Please check your connection.');
    }
  };

  const insertAtCaret = (text) => {
    const input = inputRef.current;
    if (!input) {
      // fallback: append
      setMessageInput(prev => prev + text);
      return;
    }

    // For input/textarea elements
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newVal = input.value.slice(0, start) + text + input.value.slice(end);
    setMessageInput(newVal);

    // update caret position after state update
    // using setTimeout to wait for DOM update
    setTimeout(() => {
      const pos = start + text.length;
      input.focus();
      try {
        input.setSelectionRange(pos, pos);
      } catch (err) {
        // ignore
      }
    }, 0);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          {chatWith?.username || 'User'}
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

      {/* Error Message */}
      {errorMessage && (
        <div style={{ 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          color: '#c00', 
          padding: '12px 16px', 
          fontSize: '14px',
          borderRadius: '0'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

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
        {isLoadingHistory ? (
          <div style={{textAlign: 'center', color: '#65676b', padding: '32px'}}>
            <p>Loading messages...</p>
          </div>
        ) : chatMessages.length === 0 ? (
          <div style={{textAlign: 'center', color: '#65676b', padding: '32px'}}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((msg, index) => {
            const isMyMessage = msg.from === userID;
            return (
              <div key={`${msg.timestamp}-${index}`} className={`chat-message ${isMyMessage ? 'my-message' : 'other-message'}`}>
                <div className="bubble">
                  {!isMyMessage && (
                    <div className="meta">
                      <span style={{fontWeight: '500'}}>{msg.username || chatWith?.username || `User ${msg.from}`}</span>
                    </div>
                  )}
                  <div className="text">{msg.content || msg.message}</div>
                  <div className="meta" style={{justifyContent: isMyMessage ? 'flex-end' : 'flex-start'}}>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
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
            id="emoji-button"
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
            <div id="emoji-picker" style={{
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
                    // emojiData.emoji is the unicode character
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
};

export default Chat;