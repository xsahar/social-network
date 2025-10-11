import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';

export default function MainPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const { onlineUsers } = useWebSocket(user?.userID);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWith, setChatWith] = useState(null);

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

  const startChat = (userData) => {
    setChatWith(userData);
    setChatOpen(true);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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
      
      <div className="min-h-screen bg-white">
        {/* Main Dashboard Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user.username}!</h1>
            <p className="text-gray-600">Stay connected with your friends and discover what's happening.</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              onClick={() => router.push('/posts')}
              className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg text-center transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2">View Posts</h3>
              <p className="text-blue-100">See what's happening in your network</p>
            </button>
            
            <button 
              onClick={() => router.push('/createPost')}
              className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg text-center transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2">Create Post</h3>
              <p className="text-green-100">Share your thoughts with others</p>
            </button>
            
            <button 
              onClick={() => router.push('/groups')}
              className="bg-purple-500 hover:bg-purple-600 text-white p-6 rounded-lg text-center transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2">Browse Groups</h3>
              <p className="text-purple-100">Join communities that interest you</p>
            </button>
          </div>

          {/* Online Users Sidebar */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Online Users ({onlineUsers.length})</h2>
            {onlineUsers.length === 0 ? (
              <p className="text-gray-500">No users online right now</p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((userData) => (
                  <div 
                    key={userData.id} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {userData.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{userData.username}</span>
                    </div>
                    
                    <button 
                      onClick={() => startChat(userData)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
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