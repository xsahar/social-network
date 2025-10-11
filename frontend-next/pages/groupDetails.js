import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
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

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id);
    }
  }, [id]);

  const fetchGroupDetails = async (groupId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/group-details/${groupId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const groupData = await response.json();
        setGroup(groupData);
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
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg text-gray-600">Group not found</div>
        </div>
      </Layout>
    );
  }

  const isCreator = user && group.creator_id === user.id;
  const isMember = group.user_status === 'accepted';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg mb-8">
          <h1 className="text-3xl font-bold mb-4">{group.title}</h1>
          <p className="text-blue-100 mb-4">{group.description}</p>
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="font-semibold">Members:</span> {group.member_count}
            </div>
            <div>
              <span className="font-semibold">Created by:</span> {group.creator_username}
            </div>
          </div>
        </div>

        {/* Group Actions for Members */}
        {(isMember || isCreator) && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Group Activity</h2>
              <button
                onClick={() => setShowGroupChat(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
              >
                <span>💬</span>
                <span>Group Chat</span>
              </button>
            </div>
            
            {/* Tabs for Posts and Events */}
            <div className="mb-6">
              <nav className="flex space-x-8">
                <button className="border-b-2 border-blue-600 pb-2 text-blue-600 font-medium">
                  📝 Posts
                </button>
                <button className="border-b-2 border-transparent pb-2 text-gray-500 hover:text-gray-700">
                  🎉 Events
                </button>
              </nav>
            </div>
            
            <GroupPostsSection groupId={group.id} user={user} />
            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Group Events</h3>
              <GroupEvents groupId={group.id} user={user} />
            </div>
          </div>
        )}
        
        {!isMember && !isCreator && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
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
      />
    </Layout>
  );
}
