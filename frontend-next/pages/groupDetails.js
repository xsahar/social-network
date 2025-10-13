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
        if (message.type === 'new_groupPost') {
          console.log('New group post received, refreshing...');
          // Refresh group details to get new post
          fetchGroupDetails(id);
        } else if (message.type === 'new_groupEvent') {
          console.log('New group event received, refreshing...');
          // Refresh group details to get new event
          fetchGroupDetails(id);
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
      <div className="group-details-container">
        <div className="group-header">
          <h1 className="group-title">{group.title}</h1>
          <p className="group-description">{group.description}</p>
          <div className="group-meta">
            <div className="group-meta-item">
              <span className="group-meta-label">Members:</span> {group.member_count}
            </div>
            <div className="group-meta-item">
              <span className="group-meta-label">Created by:</span> {group.creator_username}
            </div>
          </div>
        </div>

        {/* Group Actions for Members */}
        {(isMember || isCreator) && (
          <div className="group-activity">
            <div className="group-activity-header">
              <h2 className="group-activity-title">Group Activity</h2>
              <button
                onClick={() => setShowGroupChat(true)}
                className="chat-button"
              >
                <span>💬</span>
                <span>Group Chat</span>
              </button>
            </div>
            
            {/* Tabs for Posts and Events */}
            <div className="group-tabs">
              <nav className="group-tabs-nav">
                <button 
                  className={`group-tab ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  📝 Posts
                </button>
                <button 
                  className={`group-tab ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                >
                  🎉 Events
                </button>
                <button 
                  className={`group-tab ${activeTab === 'invite' ? 'active' : ''}`}
                  onClick={() => setActiveTab('invite')}
                >
                  👥 Invite Members
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'posts' && (
              <>
                {console.log('Passing groupId to GroupPostsSection:', group.id, 'Full group object:', group)}
                <GroupPostsSection groupId={group.id} user={user} />
              </>
            )}
            
            {activeTab === 'events' && (
              <div className="group-events-section">
                <h3 className="group-events-title">Group Events</h3>
                <GroupEvents groupId={group.id} user={user} />
              </div>
            )}
            
            {activeTab === 'invite' && (
              <InviteMembers groupId={group.id} />
            )}
          </div>
        )}
        
        {!isMember && !isCreator && (
          <div className="join-prompt">
            <div className="join-prompt-box">
              <h3 className="join-prompt-title">
                Join this group to see posts and participate in discussions
              </h3>
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
