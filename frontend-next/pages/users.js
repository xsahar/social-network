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
          console.log('✉️ Follow request sent:', data.message);
        } else if (data.status === 'following') {
          console.log('✅ Now following:', data.message);
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
        <title>Find Users - Social Network</title>
      </Head>
      <div className="page-layout" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 0' }}>
        <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>Find Users</h1>
        </div>
        <div className="search-bar-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <input
            type="text"
            className="search-bar"
            placeholder="Search by username, first or last name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              border: '1.5px solid #d1d5db',
              fontSize: '1rem',
              background: '#f9fafb',
              color: '#1f2937',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          />
        </div>
        <div className="users-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div className="loading-message" style={{ textAlign: 'center', color: '#6b7280' }}>
              <p>Loading users...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredUsers.length === 0 ? (
                <div className="no-posts-message" style={{ textAlign: 'center', color: '#6b7280' }}>
                  <p>No users found</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="user-card"
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: '#fff',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onClick={() => setSelectedUser(u)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <img
                        src={u.avatar || '/img/avatars/images.png'}
                        alt={u.username}
                        className="post-avatar"
                        style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #e5e7eb', background: '#f3f4f6', objectFit: 'cover' }}
                        onError={e => { e.target.src = '/img/avatars/images.png'; }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1.25rem', color: '#1f2937' }}>
                          {u.firstname} {u.lastname}
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>@{u.username}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {u.isPrivate && (
                            <span style={{ fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                              🔒 Private
                            </span>
                          )}
                          {u.isFollowing && (
                            <span style={{ fontSize: '0.8rem', backgroundColor: '#d1fae5', color: '#059669', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                              ✓ Following
                            </span>
                          )}
                          {u.requestStatus === 'pending' && (
                            <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                              ⏳ Request Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      {u.isFollowing ? (
                        <button
                          onClick={() => handleUnfollow(u.username)}
                          className="icon-btn dislike-btn"
                          style={{ minWidth: '100px' }}
                        >
                          Unfollow
                        </button>
                      ) : u.requestStatus === 'pending' ? (
                        <button
                          disabled
                          className="icon-btn"
                          style={{ minWidth: '100px', opacity: '0.5', cursor: 'not-allowed', backgroundColor: '#9ca3af' }}
                        >
                          Request Sent
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(u.username)}
                          className="icon-btn like-btn"
                          style={{ minWidth: '100px' }}
                        >
                          {u.isPrivate ? 'Request' : 'Follow'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
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
                    🔒 This is a private profile. Follow to see more details.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {selectedUser.isPrivate && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    🔒 Private Profile
                  </span>
                )}
                {selectedUser.isFollowing && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#d1fae5', color: '#059669', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    ✓ Following
                  </span>
                )}
                {selectedUser.requestStatus === 'pending' && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>
                    ⏳ Follow Request Sent
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
      </div>
    </Layout>
  );
}