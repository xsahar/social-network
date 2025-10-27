import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import GroupPostsSection from '../components/GroupPostsSection';
import GroupChat from '../components/GroupChat';
import GroupEvents from '../components/GroupEvents';

// Inline InviteMembers component
function InviteMembers({ groupId }) {
  const [invitableUsers, setInvitableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchInvitableUsers();
    }
  }, [groupId]);

  const fetchInvitableUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/groups/invitable-users?groupId=${groupId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvitableUsers(data.users || []);
      } else {
        console.error('Failed to fetch invitable users:', response.status);
        setInvitableUsers([]);
      }
    } catch (error) {
      console.error('Error fetching invitable users:', error);
      setInvitableUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/groups/send-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          groupId: groupId,
          userIds: selectedUsers
        })
      });

      if (response.ok) {
        alert(`Invitations sent to ${selectedUsers.length} user(s)!`);
        setSelectedUsers([]);
        fetchInvitableUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="invite-section">
      <h3 style={{ marginBottom: '16px' }}>Invite Members</h3>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#65676b' }}>
          Loading users...
        </div>
      ) : invitableUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#65676b' }}>
          No users available to invite
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ color: '#65676b', fontSize: '14px', marginBottom: '12px' }}>
              Select users to invite to this group:
            </p>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid #e4e6ea', 
              borderRadius: '6px',
              padding: '8px'
            }}>
              {invitableUsers.map(user => (
                <div 
                  key={user.id}
                  onClick={() => handleUserToggle(user.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedUsers.includes(user.id) ? '#e3f2fd' : 'transparent',
                    border: selectedUsers.includes(user.id) ? '1px solid #4267B2' : '1px solid transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => {}} // Handled by div onClick
                    style={{ pointerEvents: 'none' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>{user.fname} {user.lname}</div>
                    <div style={{ fontSize: '12px', color: '#65676b' }}>@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <button
              onClick={handleSendInvitations}
              disabled={sending}
              className="btn"
              style={{
                backgroundColor: sending ? '#e4e6ea' : '#4267B2',
                color: sending ? '#65676b' : 'white',
                cursor: sending ? 'not-allowed' : 'pointer'
              }}
            >
              {sending ? 'Sending...' : `Send ${selectedUsers.length} Invitation${selectedUsers.length > 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function GroupDetails() {
  const router = useRouter();
  const { user, loading: userLoading } = useSession();
  const { id } = router.query;
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  
  // Use WebSocket context for real-time chat
  const { 
    connected, 
    messages, 
    sendMessage,
    subscribe
  } = useWebSocketContext();

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id);
    }
  }, [id]);

  // Listen for real-time group updates (posts and events)
  useEffect(() => {
    if (!user || !id) return;

    const unsubscribe = subscribe((message) => {
      console.log('[GroupDetails] WebSocket message:', message);
      
      if (message.group_id == id) {
        // Don't refresh entire group for posts/events - let child components handle it
        if (message.type === 'new_groupPost') {
          console.log('New group post received (handled by GroupPostsSection)');
        } else if (message.type === 'new_groupEvent') {
          console.log('New group event received (handled by GroupEvents)');
        }
      }
    });

    return () => unsubscribe();
  }, [user, id, subscribe]);

  const fetchGroupDetails = async (groupId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/group-details/${groupId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const groupData = await response.json();
        console.log('Group data received:', groupData);
        // Backend returns {group: {...}, isMember: boolean, members: [...]}
        // We need to flatten this structure
        const flattenedGroup = {
          ...groupData.group,
          isMember: groupData.isMember,
          members: groupData.members,
          user_status: groupData.isMember ? 'accepted' : 'not_member'
        };
        console.log('Flattened group:', flattenedGroup);
        setGroup(flattenedGroup);
      } else {
        setError('Failed to fetch group details');
      }
    } catch (error) {
      setError('Error fetching group details');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="error-text">{error}</div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Group not found</div>
        </div>
      </Layout>
    );
  }

  // Fix user field name consistency - session returns userID, not id
  const userId = user?.userID || user?.id;
  const isCreator = user && group.creator_id === userId;
  const isMember = group.user_status === 'accepted';

  return (
    <Layout>
      <div className={`group-details-modern ${showGroupChat ? 'chat-open' : ''}`}>
        {/* Modern Hero Header */}
        <div className="group-details-hero">
          <div className="group-details-hero-bg"></div>
          <div className="group-details-hero-content">
            <div className="group-details-icon-wrapper">
              <div className="group-details-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
            <div className="group-details-info">
              <h1 className="group-details-title">{group.title}</h1>
              <p className="group-details-description">{group.description}</p>
              
              <div className="group-details-stats">
                <div className="group-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="group-stat-value">{group.member_count}</span>
                  <span className="group-stat-label">members</span>
                </div>
                
                <div className="group-stat-divider"></div>
                
                <div className="group-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="group-stat-label">Created by</span>
                  <span className="group-stat-value">{group.creator || group.creator_username || 'Unknown'}</span>
                </div>
                
                <div className="group-stat-divider"></div>
                
                <div className="group-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="group-stat-value">{new Date(group.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>

            {(isMember || isCreator) && (
              <button
                onClick={() => setShowGroupChat(true)}
                className="group-details-chat-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open Chat
              </button>
            )}
          </div>
        </div>

        {/* Group Content Section */}
        {(isMember || isCreator) && (
          <div className="group-content-modern">
            <div className="group-content-container">
              {/* Modern Tabs Navigation */}
              <div className="group-tabs-modern-nav">
                <button 
                  className={`group-tab-modern-item ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  <div className="group-tab-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="group-tab-content">
                    <span className="group-tab-label">Posts</span>
                    <span className="group-tab-sublabel">Share updates</span>
                  </div>
                </button>
                
                <button 
                  className={`group-tab-modern-item ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                >
                  <div className="group-tab-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="group-tab-content">
                    <span className="group-tab-label">Events</span>
                    <span className="group-tab-sublabel">Plan activities</span>
                  </div>
                </button>
                
                <button 
                  className={`group-tab-modern-item ${activeTab === 'invite' ? 'active' : ''}`}
                  onClick={() => setActiveTab('invite')}
                >
                  <div className="group-tab-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 7a4 4 0 11-8 0 4 4 0 018 0zM16 11h6M19 8v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="group-tab-content">
                    <span className="group-tab-label">Invite</span>
                    <span className="group-tab-sublabel">Add members</span>
                  </div>
                </button>
              </div>
            
            {/* Tab Content */}
            {activeTab === 'posts' && (
              <>
                {console.log('Passing groupId to GroupPostsSection:', group.id, 'Full group object:', group)}
                <GroupPostsSection groupId={group.id} user={user} />
              </>
            )}
            
            {activeTab === 'events' && (
              <GroupEvents groupId={group.id} user={user} />
            )}
            
            {activeTab === 'invite' && (
              <div className="invite-members-modern">
                <InviteMembers groupId={group.id} />
              </div>
            )}
            </div>
          </div>
        )}
        
        {!isMember && !isCreator && (
          <div className="group-join-prompt-modern">
            <div className="group-join-prompt-content">
              <div className="group-join-prompt-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="url(#gradient-join)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient-join" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className="group-join-prompt-title">
                Join this group to unlock full access
              </h3>
              <p className="group-join-prompt-description">
                Become a member to view posts, participate in events, and connect with the community
              </p>
              <button 
                onClick={() => window.history.back()}
                className="group-join-prompt-btn"
              >
                Go Back to Groups
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Group Chat Modal */}
      <GroupChat 
        groupId={group.id}
        user={user}
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
        connected={connected}
        messages={messages}
        sendMessage={sendMessage}
      />
    </Layout>
  );
}
