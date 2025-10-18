import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function GroupPostsSection({ groupId, user }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [postImage, setPostImage] = useState(null);
  const router = useRouter();
  const { subscribe } = useWebSocketContext();

  // Debug log to check groupId
  console.log('GroupPostsSection received groupId:', groupId, 'type:', typeof groupId);

  useEffect(() => {
    if (groupId) {
      fetchGroupPosts();
    }
  }, [groupId]);

  // Listen for real-time post updates
  useEffect(() => {
    if (!user || !groupId) return;

    const unsubscribe = subscribe((message) => {
      console.log('[GroupPostsSection] Received WebSocket message:', message);
      
      if (message.group_id == groupId) {
        if (message.type === 'new_groupPost') {
          console.log('[GroupPostsSection] New group post detected, refreshing...');
          fetchGroupPosts();
        } else if (message.type === 'group_post_like_update') {
          // Parse like counts from message content and update UI without refresh
          try {
            const likeData = JSON.parse(message.content);
            console.log('[GroupPostsSection] Like update data:', likeData);
            
            setPosts(prev => prev.map(post => 
              post.id === likeData.post_id 
                ? { 
                    ...post, 
                    like_count: likeData.likes_count,
                    dislike_count: likeData.dislikes_count 
                  }
                : post
            ));
          } catch (e) {
            console.error('[GroupPostsSection] Failed to parse like data:', e);
          }
        } else if (message.type === 'group_post_comment') {
          console.log('[GroupPostsSection] New comment detected, refreshing post list...');
          fetchGroupPosts();
        }
      }
    });

    return () => unsubscribe();
  }, [user, groupId, subscribe]);

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
    
    if (!groupId) {
      alert(`Group ID is missing. Received: ${groupId} (type: ${typeof groupId})`);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('group_id', groupId.toString());
      formData.append('title', newPost.title.trim());
      formData.append('content', newPost.content.trim());
      
      // Add image if selected
      if (postImage) {
        formData.append('imgOrgif', postImage);
      }
      
      console.log('Creating post with groupId:', groupId, 'FormData:', {
        group_id: groupId.toString(),
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        hasImage: !!postImage
      });

      // Debug: Log FormData entries
      for (let pair of formData.entries()) {
        console.log('FormData entry:', pair[0], '=', pair[1]);
      }
      
      const response = await fetch('http://localhost:8080/groups/create-post', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        setShowCreatePost(false);
        setNewPost({ title: '', content: '' });
        setPostImage(null);
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
      const response = await fetch(`http://localhost:8080/groups/likes?groupId=${groupId}&postId=${postId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update local state immediately with the response data
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                like_count: data.likes,
                dislike_count: data.dislikes,
                is_liked: !post.is_liked  // Toggle the liked state
              }
            : post
        ));
      } else {
        console.error('Failed to toggle like');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDislike = async (postId) => {
    try {
      const response = await fetch(`http://localhost:8080/groups/dislikes?groupId=${groupId}&postId=${postId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update local state immediately with the response data
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                like_count: data.likes,
                dislike_count: data.dislikes,
                is_disliked: !post.is_disliked  // Toggle the disliked state
              }
            : post
        ));
      } else {
        console.error('Failed to toggle dislike');
      }
    } catch (error) {
      console.error('Error toggling dislike:', error);
    }
  };

  return (
    <div className="group-posts-section">
      {/* Create Post Button */}
      <div className="create-post-prompt">
        <button
          onClick={() => setShowCreatePost(true)}
          className="create-post-button"
        >
          <span>✏️ What's on your mind? Share with your group...</span>
        </button>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowCreatePost(false)}>&times;</span>
            <h2>Create New Group Post</h2>
            
            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label>Post Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder="Enter a catchy title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows="4"
                  placeholder="Share your thoughts with the group..."
                  required
                />
              </div>
              
              {/* Image Upload */}
              <div className="form-group">
                <label>Add Image or GIF (Optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={(e) => setPostImage(e.target.files[0])}
                />
                {postImage && (
                  <div className="image-preview">
                    <img
                      src={URL.createObjectURL(postImage)}
                      alt="Preview"
                      style={{ maxWidth: '200px', marginTop: '10px', borderRadius: '8px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setPostImage(null)}
                      className="btn btn-secondary"
                      style={{ marginTop: '10px' }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <button type="button" onClick={() => setShowCreatePost(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Share Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loadingPosts ? (
        <div className="loading-container">
          <div className="loading-text">Loading posts...</div>
        </div>
      ) : posts.length === 0 ? (
        <div className="no-posts-message">
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📝</div>
          <h3>No posts yet</h3>
          <p>Be the first to share something with your group!</p>
          <button
            onClick={() => setShowCreatePost(true)}
            className="btn btn-primary"
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map(post => (
            <div key={post.id} className="post-card">
              {/* Post Header */}
              <div className="post-header">
                <div className="post-author">
                  <div className="post-avatar" style={{
                    background: 'linear-gradient(135deg, #4267B2 0%, #365899 100%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {post.username ? post.username[0].toUpperCase() : 'U'}
                  </div>
                  <div className="post-author-info">
                    <h3>{post.username || 'Unknown User'}</h3>
                    <div className="post-meta">
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <h2>{post.title}</h2>
              <p className="post-content">{post.content}</p>

              {/* Post Image */}
              {post.image && (
                <div className="post-image-container">
                  <img
                    src={post.image}
                    alt="Post image"
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="post-actions">
                <div className="like-buttons">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`icon-btn like-btn ${post.is_liked ? 'active' : ''}`}
                  >
                    👍 Like ({post.like_count || 0})
                  </button>
                  
                  <button
                    onClick={() => handleDislike(post.id)}
                    className={`icon-btn dislike-btn ${post.is_disliked ? 'active' : ''}`}
                  >
                    👎 Dislike ({post.dislike_count || 0})
                  </button>
                  
                  <button
                    onClick={() => router.push(`/comments?postId=${post.id}&type=group&groupId=${groupId}`)}
                    className="icon-btn comment-btn"
                  >
                    💬 Comments ({post.comment_count || 0})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}