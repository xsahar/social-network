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
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Loading groups...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Groups - Social Network</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Create Group
            </button>
          </div>

          {/* Create Group Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Group</h3>
                  <form onSubmit={handleCreateGroup}>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Group Title:
                      </label>
                      <input
                        type="text"
                        value={newGroup.title}
                        onChange={(e) => setNewGroup({...newGroup, title: e.target.value})}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Description:
                      </label>
                      <textarea
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                        rows="4"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        Create Group
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {['all', 'my', 'invitations'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'all' ? 'All Groups' : tab === 'my' ? 'My Groups' : 'Invitations'}
                </button>
              ))}
            </nav>
          </div>

          {/* Groups List */}
          <div className="space-y-4">
            {getCurrentGroups().map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{group.title}</h3>
                      <p className="text-gray-600 mb-3">{group.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {group.member_count || 0} members
                        </span>
                        <span>Created by {group.creator_name || group.creator}</span>
                        <span>{new Date(group.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {(() => {
                        const isCreator = user?.userID === group.creator_id;
                        const membershipStatus = group.user_membership_status;
                        const isMember = membershipStatus === 'accepted';
                        const isPending = membershipStatus === 'pending';

                        if (isCreator) {
                          // Creator - can view but not leave their own group
                          return (
                            <button
                              onClick={() => viewGroupDetails(group.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                              Manage Group
                            </button>
                          );
                        } else if (isMember) {
                          // Member - can view and leave
                          return (
                            <>
                              <button
                                onClick={() => viewGroupDetails(group.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                View Group
                              </button>
                              <button
                                onClick={() => handleLeaveGroup(group.id)}
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                Leave Group
                              </button>
                            </>
                          );
                        } else if (isPending) {
                          // Pending request - show status and view details
                          return (
                            <>
                              <button
                                disabled
                                className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
                              >
                                Request Pending
                              </button>
                              <button
                                onClick={() => viewGroupDetails(group.id)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                View Details
                              </button>
                            </>
                          );
                        } else {
                          // Not a member - can join and view details
                          return (
                            <>
                              <button
                                onClick={() => handleJoinGroup(group.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                Join Group
                              </button>
                              <button
                                onClick={() => viewGroupDetails(group.id)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                View Details
                              </button>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  
                  {/* Members Preview */}
                  {group.members && group.members.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Recent members:</span>
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 3).map((member, index) => (
                            <img
                              key={index}
                              src={member.avatar || '/css/icon.png'}
                              alt={member.username}
                              className="w-6 h-6 rounded-full border-2 border-white"
                              title={member.username}
                            />
                          ))}
                          {group.members.length > 3 && (
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-xs text-gray-600 border-2 border-white">
                              +{group.members.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {getCurrentGroups().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
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
