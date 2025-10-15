import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function MainPage() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { onlineUsers } = useWebSocketContext();

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

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push('/login');
    }
  };

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
    <div className="layout-container">
      <Head>
        <title>Social Network - Dashboard</title>
      </Head>
      
      {/* Simple Header for Home Page Only */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span style={{ cursor: 'default' }}>SocialNet</span>
          </div>
          
          <div className="nav-menu">
            <div className="nav-user-menu">
              <span className="nav-welcome">Welcome, {user.username}</span>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="dashboard-container">
          {/* Main Dashboard Content */}
          <div className="container">
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
            <h2>Online Users ({onlineUsers.filter(u => u.id !== user?.userID).length})</h2>
            {onlineUsers.filter(u => u.id !== user?.userID).length === 0 ? (
              <p>No other users online right now</p>
            ) : (
              <div className="online-users-list">
                {onlineUsers
                  .filter(u => u.id !== user?.userID)
                  .map((userData) => (
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
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}