import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Layout = ({ children }) => {
  const { user, loading, logout } = useSession();
  const { onlineUsers, connected } = useWebSocket(user?.userID);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push('/login');
    }
  };

  const navigateTo = (path) => {
    router.push(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-white hover:text-blue-100">
              SocialNet
            </Link>
          </div>
          
          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <button 
                  onClick={() => navigateTo('/login')} 
                  className="text-white hover:text-blue-100 px-4 py-2 rounded transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => navigateTo('/signUp')} 
                  className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigateTo('/posts')} 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded transition-colors"
                >
                  Posts
                </button>
                <button 
                  onClick={() => navigateTo('/createPost')} 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded transition-colors"
                >
                  Create Post
                </button>
                <button 
                  onClick={() => navigateTo('/groups')} 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded transition-colors"
                >
                  Groups
                </button>
                <button 
                  onClick={() => navigateTo('/users')} 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded transition-colors"
                >
                  Find Users
                </button>
                <button 
                  onClick={() => navigateTo('/myProfile')} 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded transition-colors"
                >
                  Profile
                </button>
                
                {/* User Menu */}
                <div className="flex items-center space-x-3">
                  <span className="text-blue-100 text-sm">Welcome, {user.username}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;