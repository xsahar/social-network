import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GroupPostsSection({ groupId, user }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const router = useRouter();

  useEffect(() => {
    if (groupId) {
      fetchGroupPosts();
    }
  }, [groupId]);

  const fetchGroupPosts = async () => {
    if (!groupId) return;
    
    try {
      setLoadingPosts(true);
      console.log('Fetching group posts for groupId:', groupId);
      
      const response = await fetch(`http://localhost:8080/groups/${groupId}/posts`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const postsData = await response.json();
        console.log('Posts data received:', postsData);
        setPosts(Array.isArray(postsData) ? postsData : []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch group posts:', response.status, errorText);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching group posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('group_id', groupId);
      formData.append('title', newPost.title.trim());
      formData.append('content', newPost.content.trim());
      
      const response = await fetch('http://localhost:8080/groups/create-post', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        setShowCreatePost(false);
        setNewPost({ title: '', content: '' });
        fetchGroupPosts(); // Refresh posts
        alert('Post created successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to create post: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post');
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch('http://localhost:8080/groups/toggle-post-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_post_id: postId }),
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchGroupPosts(); // Refresh posts to get updated like count
      } else {
        console.error('Failed to toggle like');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <button
          onClick={() => setShowCreatePost(true)}
          className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 transition-colors"
        >
          <span className="text-gray-600">✏️ What's on your mind? Share with your group...</span>
        </button>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Group Post</h3>
              <button 
                onClick={() => setShowCreatePost(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a catchy title..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your thoughts with the group..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Share Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loadingPosts ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
          <p className="text-gray-500 mt-4">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-4">Be the first to share something with your group!</p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {post.username ? post.username[0].toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{post.username || 'Unknown User'}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
                <p className="text-gray-700 mb-4 leading-relaxed">{post.content}</p>

                {/* Post Image */}
                {post.image && (
                  <img
                    src={post.image}
                    alt="Post image"
                    className="w-full max-w-lg rounded-lg mb-4"
                  />
                )}
              </div>

              {/* Post Actions */}
              <div className="px-6 py-3 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                        post.is_liked 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <span>👍 Like</span>
                      <span>({post.like_count || 0})</span>
                    </button>
                    
                    <button
                      onClick={() => router.push(`/comments?postId=${post.id}&type=group&groupId=${groupId}`)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                    >
                      <span>💬 Comments</span>
                      <span>({post.comment_count || 0})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}