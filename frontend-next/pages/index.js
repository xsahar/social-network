import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useChat } from '../hooks/useChat';

export default function MainPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const { onlineUsers } = useWebSocketContext();
  const { chatOpen, chatWith, startChat, setChatOpen } = useChat();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('🔄 No user found, redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 100);
    } else if (user) {
      console.log('✅ User found:', user);
    }
  }, [user, loading, router]);



  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>Social Network - Dashboard</title>
      </Head>
      
      <div className="dashboard-container">
        {/* Main Dashboard Content */}
        <div className="container">
          <div className="dashboard-header">
            <h1>Welcome back, {user.username}!</h1>
            <p>Stay connected with your friends and discover what's happening.</p>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-grid">
            <button 
              onClick={() => router.push('/posts')}
              className="dashboard-card dashboard-card-blue"
            >
              <h3>View Posts</h3>
              <p>See what's happening in your network</p>
            </button>
            
            <button 
              onClick={() => router.push('/createPost')}
              className="dashboard-card dashboard-card-green"
            >
              <h3>Create Post</h3>
              <p>Share your thoughts with others</p>
            </button>
            
            <button 
              onClick={() => router.push('/groups')}
              className="dashboard-card dashboard-card-purple"
            >
              <h3>Browse Groups</h3>
              <p>Join communities that interest you</p>
            </button>
          </div>

          {/* Online Users Sidebar */}
          <div className="online-users-section">
            <h2>Online Users ({onlineUsers.length})</h2>
            {onlineUsers.length === 0 ? (
              <p>No users online right now</p>
            ) : (
              <div className="online-users-list">
                {onlineUsers.map((userData) => (
                  <div 
                    key={userData.id} 
                    className="online-user-item"
                  >
                    <div className="user-info">
                      <div className="user-avatar-small">
                        <span>
                          {userData.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="username">{userData.username}</span>
                    </div>
                    
                    <button 
                      onClick={() => startChat(userData)}
                      className="chat-btn"
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Component */}
      {chatOpen && chatWith && (
        <Chat
          targetUser={chatWith}
          onClose={() => setChatOpen(false)}
        />
      )}
    </Layout>
  );
}