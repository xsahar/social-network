import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import { useChat } from '../hooks/useChat';
import Chat from '../components/Chat';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    nickname: '',
    bio: '',
    email: '',
    age: '',
    gender: '',
    dateOfBirth: '',
    avatarFile: null
  });
  const { user, loading: sessionLoading } = useSession();
  const { onlineUsers } = useWebSocket(user?.userID);
  const { chatOpen, chatWith, startChat, setChatOpen } = useChat();
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setPosts(data.posts || []);
        setFollowers(data.followers || []);
        setFollowing(data.following || []);
        setPendingRequests(data.pendingRequests || []);
        setIsPrivate(data.profile?.isPrivate || false);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacy = async () => {
    try {
      const response = await fetch('/api/toggle-privacy', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsPrivate(!isPrivate);
      }
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
    }
  };

  useEffect(() => {
    if (user && user.userID) {
      fetchProfile();
    }
  }, [user?.userID]);



  const handleEditProfile = () => {
    setEditForm({
      firstname: profile?.fname || '',
      lastname: profile?.lname || '',
      nickname: profile?.nickname || '',
      bio: profile?.bio || '',
      email: profile?.email || '',
      age: profile?.age || '',
      gender: profile?.gender || '',
      dateOfBirth: profile?.dateOfBirth || ''
    });
    setEditMode(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      // If there's a file, use FormData, otherwise use JSON
      let requestBody;
      let headers = {};
      
      if (editForm.avatarFile && editForm.avatarFile.size > 0) {
        // Use FormData for file upload
        const formData = new FormData();
        Object.keys(editForm).forEach(key => {
          if (key !== 'avatarFile' && editForm[key] !== null && editForm[key] !== '') {
            formData.append(key, editForm[key]);
          }
        });
        formData.append('avatarInput', editForm.avatarFile);
        requestBody = formData;
      } else {
        // Use JSON for text-only updates
        const profileData = {};
        Object.keys(editForm).forEach(key => {
          if (key !== 'avatarFile' && editForm[key] !== null && editForm[key] !== '') {
            profileData[key] = editForm[key];
          }
        });
        requestBody = JSON.stringify(profileData);
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: headers,
        body: requestBody,
        credentials: 'include'
      });

      if (response.ok) {
        setEditMode(false);
        fetchProfile(); // Refresh profile data
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditForm({
      firstname: '',
      lastname: '',
      nickname: '',
      bio: '',
      email: '',
      age: '',
      gender: '',
      dateOfBirth: '',
      avatarFile: null
    });
  };

  const handleFollowRequest = async (requesterId, action) => {
    try {
      const response = await fetch('/api/handle-follow-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requester_id: requesterId,
          action: action
        })
      });

      if (response.ok) {
        // Refresh profile data to update pending requests and followers
        fetchProfile();
      }
    } catch (error) {
      console.error('Error handling follow request:', error);
    }
  };

  return (
    <Layout>
      <Head>
        <title>My Profile - Social Network</title>
      </Head>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <img
                  src={profile?.avatar || '/css/icon.png'}
                  alt="Profile Avatar"
                  className="w-24 h-24 rounded-full border-4 border-gray-200"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile?.fname} {profile?.lname}
                    {profile?.nickname && <span className="text-lg text-gray-600 font-normal ml-2">({profile.nickname})</span>}
                  </h1>
                  <p className="text-gray-600">@{profile?.username}</p>
                  
                  {/* Additional Profile Info */}
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {profile?.email && (
                      <div>📧 {profile.email}</div>
                    )}
                    {profile?.age && profile?.gender && (
                      <div>👤 {profile.age} years old • {profile.gender}</div>
                    )}
                    {profile?.dateOfBirth && (
                      <div>🎂 Born {new Date(profile.dateOfBirth).toLocaleDateString()}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 mt-3">
                    <span className="text-sm text-gray-500">
                      <strong>{followers.length}</strong> Followers
                    </span>
                    <span className="text-sm text-gray-500">
                      <strong>{following.length}</strong> Following
                    </span>
                    <span className="text-sm text-gray-500">
                      <strong>{posts.length}</strong> Posts
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleEditProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={togglePrivacy}
                  className={`px-4 py-2 text-sm rounded-lg font-medium ${
                    isPrivate 
                      ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {isPrivate ? '🔒 Private' : '🌍 Public'}
                </button>
              </div>
            </div>

            {profile?.bio && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">About</h3>
                <p className="text-gray-700">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Edit Profile Form */}
          {editMode && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
              <form onSubmit={handleSaveProfile}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editForm.firstname}
                      onChange={(e) => setEditForm({...editForm, firstname: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editForm.lastname}
                      onChange={(e) => setEditForm({...editForm, lastname: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={editForm.nickname}
                      onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your nickname"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editForm.age}
                      onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Picture (Optional)
                  </label>
                  <div className="flex items-center space-x-4">
                    <img
                      src={profile?.avatar || '/css/icon.png'}
                      alt="Current avatar"
                      className="w-16 h-16 rounded-full border-2 border-gray-200"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditForm({...editForm, avatarFile: e.target.files[0]})}
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Supported: JPEG, PNG, GIF</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Profile Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => router.push('/createPost')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Post
            </button>
            <button
              onClick={() => router.push('/posts')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
            >
              📋 View All Posts
            </button>
          </div>

          {/* Pending Follow Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Follow Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={request.avatar || '/css/icon.png'}
                        alt={request.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.firstname} {request.lastname}
                        </div>
                        <div className="text-sm text-gray-500">@{request.username}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFollowRequest(request.id, 'accept')}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleFollowRequest(request.id, 'decline')}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Posts */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Posts</h2>
            
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">You haven't created any posts yet</p>
                <button
                  onClick={() => router.push('/createPost')}
                  className="mt-4 button-main"
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                      <span className="text-sm text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{post.content}</p>
                    
                    {post.category && (
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {post.category}
                      </span>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <span className="text-sm text-gray-500">
                        Likes: {post.likes || 0}
                      </span>
                      <span className="text-sm text-gray-500">
                        Comments: {post.comments || 0}
                      </span>
                      <button
                        onClick={() => router.push(`/comments?postId=${post.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Followers and Following */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Followers */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Followers ({followers.length})
              </h2>
              {followers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No followers yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {followers.map((follower) => (
                    <div key={follower.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <img
                          src={follower.avatar || '/css/icon.png'}
                          alt={follower.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {follower.firstname} {follower.lastname}
                          </div>
                          <div className="text-xs text-gray-500">@{follower.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => startChat(follower)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        💬
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Following */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Following ({following.length})
              </h2>
              {following.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Not following anyone yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {following.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.avatar || '/css/icon.png'}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {user.firstname} {user.lastname}
                          </div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => startChat(user)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        💬
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
