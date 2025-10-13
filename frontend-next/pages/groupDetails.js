import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import GroupPostsSection from '../components/GroupPostsSection';
import GroupChat from '../components/GroupChat';
import GroupEvents from '../components/GroupEvents';

export default function GroupDetails() {
  const router = useRouter();
  const { user, loading: userLoading } = useSession();
  const { id } = router.query;
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  
  // Use WebSocket hook for real-time chat - fix field name consistency
  const { 
    connected, 
    messages, 
    sendMessage, 
    connectWebSocket, 
    disconnect 
  } = useWebSocket(user?.userID || user?.id);

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id);
    }
  }, [id]);

  // WebSocket connection is handled automatically by the useWebSocket hook

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
              <div className="invite-section">
                <h3>Invite Members</h3>
                <p>Invite functionality coming soon...</p>
              </div>
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
