import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import Chat from '../components/Chat';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWith, setChatWith] = useState(null);
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const fetchUsers = async (search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/users?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Users API failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && user?.id) {
      fetchUsers();
    }
  }, [sessionLoading, user?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const handleFollow = async (username) => {
    try {
      const response = await fetch('/api/follow-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchUsers(searchQuery); // Refresh the list
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (username) => {
    try {
      const response = await fetch('/api/unfollow-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchUsers(searchQuery); // Refresh the list
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const startChat = (user) => {
    setChatWith(user);
    setChatOpen(true);
  };

  if (sessionLoading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-lg text-gray-600">Redirecting to login...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Find Users - Social Network</title>
      </Head>
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Find Users</h1>
            <button
              onClick={() => router.push('/myProfile')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              My Profile
            </button>
          </div>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or username..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchUsers('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          </form>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <img
                        src={u.avatar || '/img/avatars/images.png'}
                        alt={u.username}
                        className="w-12 h-12 rounded-full"
                        onError={(e) => {
                          e.target.src = '/img/avatars/images.png';
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {u.firstname} {u.lastname}
                        </div>
                        <div className="text-sm text-gray-500">@{u.username}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          {u.isPrivate && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                              🔒 Private
                            </span>
                          )}
                          {u.isFollowing && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                              ✓ Following
                            </span>
                          )}
                          {u.requestStatus === 'pending' && (
                            <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">
                              ⏳ Request Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {u.isFollowing ? (
                        <button
                          onClick={() => handleUnfollow(u.username)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                        >
                          Unfollow
                        </button>
                      ) : u.requestStatus === 'pending' ? (
                        <button
                          disabled
                          className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                        >
                          Request Sent
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(u.username)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                        >
                          {u.isPrivate ? 'Request to Follow' : 'Follow'}
                        </button>
                      )}
                      
                      {(u.isFollowing || !u.isPrivate) && (
                        <button
                          onClick={() => startChat(u)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                        >
                          💬 Chat
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Component */}
      <Chat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        chatWith={chatWith}
        userID={user?.userID}
      />
    </Layout>
  );
}