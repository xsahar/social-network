import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const { user, loading: sessionLoading } = useSession();
  const { subscribe } = useWebSocketContext();
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Users] Fetched users:', data.users);
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
    if (!sessionLoading && user?.userID) {
      fetchUsers();
    }
  }, [sessionLoading, user?.userID]);

  // Listen for real-time follow/unfollow updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe((message) => {
      console.log('[Users] Received WebSocket message:', message);

      // Handle follow status updates and follow request responses
      if (message.type === 'follow_update' || message.type === 'new_follower' || message.type === 'unfollow_update' || message.type === 'follow_request_response' || message.type === 'follow_request' || message.type === 'privacy_update') {
        // Refresh the users list to get updated follow/request status
        fetchUsers();
      }
    });

    return () => unsubscribe();
  }, [user, subscribe]);



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
        
        // Show appropriate message based on response
        if (data.status === 'pending') {
          console.log('Follow request sent:', data.message);
        } else if (data.status === 'following') {
          console.log('Now following:', data.message);
        }
        
        // Refresh the list to show updated status
        fetchUsers();
      } else {
        const errorText = await response.text();
        console.error('Failed to follow user:', response.status, errorText);
        
        // If already following, just refresh
        if (errorText.includes('Already following')) {
          fetchUsers();
        }
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
        console.log('Unfollow response:', data.message || data);
        fetchUsers(); // Refresh the list
      } else {
        console.error('Failed to unfollow user:', response.status);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };



  if (sessionLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Loading...</div>
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
        <div className="loading-container">
          <div className="loading-text">Redirecting to login...</div>
        </div>
      </Layout>
    );
  }

  // Filter users by search
  const filteredUsers = users.filter(u => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      u.username?.toLowerCase().includes(term) ||
      u.firstname?.toLowerCase().includes(term) ||
      u.lastname?.toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <Head>
        <title>Find Amazing People - Connect & Inspire</title>
        <meta name="description" content="Discover incredible people and build lasting friendships!" />
      </Head>
      
      <div className="users-page-bg">
        <div className="container-professional">
          {/* Professional Users Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl mb-8 animate-float animate-pulse-glow">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">U</div>
            </div>
            
            <h1 className="text-5xl font-bold text-gradient mb-6">
              Discover Amazing People
            </h1>
            
            <p className="text-xl text-gray-700 font-medium mb-8 max-w-3xl mx-auto">
              Connect with <span className="font-bold text-gradient">incredible souls</span> who share your passions! 
              Build friendships that create <span className="font-bold text-gradient">magical memories</span>!
            </p>
          </div>
          {/* Professional Search Section */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--gradient-cosmic)' }}></div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-3">
                Find Your Next Connection
              </h2>
              <p className="text-gray-600 font-medium">Search for amazing people by name or username</p>
            </div>
            
            <div className="max-w-lg mx-auto relative">
              <input
                type="text"
                placeholder="Search for incredible people..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-8 py-4 border-2 border-gray-200 rounded-2xl bg-gray-50/50 font-semibold text-lg transition-all duration-300 focus:border-purple-500 focus:bg-white focus:shadow-xl focus:transform focus:scale-105 outline-none backdrop-blur-sm"
              />
            </div>
          </div>
          {/* Professional Users List */}
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-12 shadow-xl border border-white/30 text-center animate-pulse">
                <div className="text-6xl mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Finding amazing people...</h3>
                <p className="text-lg text-gray-600">Discovering connections for you</p>
                <div className="loading-spinner mt-6"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredUsers.length === 0 ? (
                  <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-16 shadow-xl border border-white/30 text-center relative overflow-hidden">
                    
                    <div className="text-8xl mb-8 animate-float">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">?</div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-4">No matches found</h3>
                    <p className="text-xl text-gray-600 mb-8">
                      Try a different search or explore all our <span className="font-bold text-gradient">amazing members</span>
                    </p>
                    <button 
                      onClick={() => setSearch('')}
                      className="btn btn-primary btn-lg"
                    >
                      Show All Users
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-8 relative overflow-hidden group hover:scale-102 transition-all duration-300 cursor-pointer"
                        onClick={() => setSelectedUser(u)}
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
                        }}
                      >
                        {/* Card Background Effects */}
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: 'var(--gradient-cosmic)' }}></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-5 group-hover:opacity-8 transition-opacity animate-pulse" style={{ background: 'var(--gradient-sunset)' }}></div>
                        
                        {/* User Card Content */}
                        <div className="flex items-center justify-between relative z-10">
                          {/* User Info Section */}
                          <div className="flex items-center gap-6">
                            {/* Professional Avatar */}
                            <div className="relative">
                              <img
                                src={u.avatar || '/img/avatars/images.png'}
                                alt={u.username}
                                className="w-20 h-20 rounded-2xl object-cover border-3 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                                onError={e => { e.target.src = '/img/avatars/images.png'; }}
                              />
                              {/* Online Status Indicator */}
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse shadow-md"></div>
                            </div>
                            
                            {/* User Details */}
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-gradient transition-colors">
                                {u.firstname} {u.lastname}
                              </h3>
                              <p className="text-lg text-gray-600 font-medium mb-3">@{u.username}</p>
                              
                              {/* Status Badges */}
                              <div className="flex flex-wrap items-center gap-3">
                                {u.isPrivate && (
                                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-200 font-semibold">
                                    <span>Private</span>
                                  </span>
                                )}
                                {u.isFollowing && (
                                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-semibold animate-pulse">
                                    <span>Following</span>
                                  </span>
                                )}
                                {u.requestStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200 font-semibold">
                                    <span>Request Sent</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Button Section */}
                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            {u.isFollowing ? (
                              <button
                                onClick={() => handleUnfollow(u.username)}
                                className="btn btn-danger btn-lg group relative overflow-hidden"
                              >
                                Unfollow
                              </button>
                            ) : u.requestStatus === 'pending' ? (
                              <button
                                disabled
                                className="btn btn-warning btn-lg opacity-60 cursor-not-allowed"
                              >
                                Request Sent
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFollow(u.username)}
                                className="btn btn-success btn-lg group relative overflow-hidden"
                              >
                                {u.isPrivate ? 'Request' : 'Follow'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Hover Effect Decorations */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User Details Modal */}
      {selectedUser && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setSelectedUser(null)}
          >
            <div
              className="user-modal-card"
              style={{
                maxWidth: '500px',
                width: '90%',
                margin: '1rem',
                background: '#fff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '1rem',
                boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                padding: '2rem',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>User Profile</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '2rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <img
                  src={selectedUser.avatar || '/img/avatars/images.png'}
                  alt={selectedUser.username}
                  className="post-avatar"
                  style={{ width: '90px', height: '90px', borderRadius: '50%', border: '2px solid #e5e7eb', background: '#f3f4f6', objectFit: 'cover' }}
                  onError={e => { e.target.src = '/img/avatars/images.png'; }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                    {selectedUser.firstname} {selectedUser.lastname}
                  </h3>
                  {selectedUser.nickname && (
                    <p style={{ color: '#6b7280', fontSize: '0.95rem', fontStyle: 'italic' }}>
                      "{selectedUser.nickname}"
                    </p>
                  )}
                  <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>@{selectedUser.username}</p>
                </div>
              </div>
              {/* User Details - Only shown if public or following */}
              {(!selectedUser.isPrivate || selectedUser.isFollowing) && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  {selectedUser.email && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Email</h4>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{selectedUser.email}</p>
                    </div>
                  )}
                  {selectedUser.dateOfBirth && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Date of Birth</h4>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{new Date(selectedUser.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedUser.bio && (
                    <div>
                      <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem', fontSize: '0.95rem' }}>About Me</h4>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{selectedUser.bio}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Privacy Notice for Private Profiles */}
                {selectedUser.isPrivate && !selectedUser.isFollowing && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#92400e', fontSize: '0.95rem' }}>
                    This is a private profile. Follow to see more details.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {selectedUser.isPrivate && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    Private Profile
                  </span>
                )}
                {selectedUser.isFollowing && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#d1fae5', color: '#059669', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    Following
                  </span>
                )}
                {selectedUser.requestStatus === 'pending' && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    Follow Request Sent
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedUser.isFollowing ? (
                  <button
                    onClick={() => {
                      handleUnfollow(selectedUser.username);
                      setSelectedUser(null);
                    }}
                    className="icon-btn dislike-btn"
                    style={{ flex: 1 }}
                  >
                    Unfollow
                  </button>
                ) : selectedUser.requestStatus === 'pending' ? (
                  <button
                    disabled
                    className="icon-btn"
                    style={{ flex: 1, opacity: '0.5', cursor: 'not-allowed', backgroundColor: '#9ca3af' }}
                  >
                    Request Sent
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleFollow(selectedUser.username);
                      setSelectedUser(null);
                    }}
                    className="icon-btn like-btn"
                    style={{ flex: 1 }}
                  >
                    {selectedUser.isPrivate ? 'Request to Follow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }