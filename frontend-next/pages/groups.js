import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';

export default function Groups() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ title: '', description: '' });

  useEffect(() => {
    if (user && user.userID) {
      fetchGroups();
    }
  }, [user?.userID]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const groupsList = data?.groups || [];
        setGroups(groupsList);
      } else {
        console.error('Failed to fetch groups:', response.status);
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    }
    setLoadingGroups(false);
  };


  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
        credentials: 'include'
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        setNewGroup({ title: '', description: '' });
        fetchGroups();
      } else {
        console.error('Failed to create group:', response.status);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const response = await fetch('/api/join-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Refresh data to get updated membership status
        fetchGroups();
      } else {
        const errorData = await response.json();
        console.error('Failed to join group:', response.status, errorData);
        
        if (response.status === 409) {
          alert('You have already requested to join this group or are already a member.');
        } else {
          alert(`Failed to join group: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      const response = await fetch('/api/leave-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Refresh data to get updated membership status
        fetchGroups();
      } else {
        console.error('Failed to leave group:', response.status);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const viewGroupDetails = (groupId) => {
    router.push(`/groupDetails?id=${groupId}`);
  };

  const getCurrentGroups = () => {
    switch (activeTab) {
      case 'all':
        return groups;
      case 'my':
        return userGroups;
      case 'invitations':
        return []; // Would need to fetch invitations
      default:
        return groups;
    }
  };

  if (loading || loadingGroups) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Loading groups...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Groups - Social Network</title>
      </Head>
      
      <div className="groups-section">
        <div className="container">
          {/* Header */}
          <div className="groups-header">
            <h1>Groups</h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Group
            </button>
          </div>

          {/* Create Group Modal */}
          {showCreateModal && (
            <div className="modal">
              <div className="modal-content">
                <span className="close" onClick={() => setShowCreateModal(false)}>&times;</span>
                <h2>Create New Group</h2>
                <form onSubmit={handleCreateGroup}>
                  <div className="form-group">
                    <label>Group Title:</label>
                    <input
                      type="text"
                      value={newGroup.title}
                      onChange={(e) => setNewGroup({...newGroup, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                      rows="4"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Create Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {['all', 'my', 'invitations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'all' ? 'All Groups' : tab === 'my' ? 'My Groups' : 'Invitations'}
              </button>
            ))}
          </div>

          {/* Groups List */}
          <div className="groups-grid">
            {getCurrentGroups().map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.title}</h3>
                  <span className="member-count">{group.member_count || 0} members</span>
                </div>
                <p className="group-description">{group.description}</p>
                <div className="group-meta">
                  <span>Created by {group.creator_name || group.creator}</span>
                  <span>{new Date(group.created_at).toLocaleDateString()}</span>
                </div>
                    
                <div className="group-actions">
                  {(() => {
                    const isCreator = user?.userID === group.creator_id;
                    const membershipStatus = group.user_membership_status;
                    const isMember = membershipStatus === 'accepted';
                    const isPending = membershipStatus === 'pending';

                    if (isCreator) {
                      return (
                        <button
                          onClick={() => viewGroupDetails(group.id)}
                          className="btn btn-primary"
                        >
                          Manage Group
                        </button>
                      );
                    } else if (isMember) {
                      return (
                        <>
                          <button
                            onClick={() => viewGroupDetails(group.id)}
                            className="btn btn-primary"
                          >
                            View Group
                          </button>
                          <button
                            onClick={() => handleLeaveGroup(group.id)}
                            className="btn btn-danger"
                          >
                            Leave Group
                          </button>
                        </>
                      );
                    } else if (isPending) {
                      return (
                        <>
                          <button disabled className="btn btn-warning">
                            Request Pending
                          </button>
                          <button
                            onClick={() => viewGroupDetails(group.id)}
                            className="btn btn-secondary"
                          >
                            View Details
                          </button>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <button
                            onClick={() => handleJoinGroup(group.id)}
                            className="btn btn-success"
                          >
                            Join Group
                          </button>
                          <button
                            onClick={() => viewGroupDetails(group.id)}
                            className="btn btn-secondary"
                          >
                            View Details
                          </button>
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>

          {getCurrentGroups().length === 0 && (
            <div className="no-groups-message">
              <p>
                {activeTab === 'all' ? 'No groups available' : 
                 activeTab === 'my' ? 'You haven\'t joined any groups yet' : 
                 'No invitations'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
