import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import Toast from './Toast';

export default function GroupPostsSection({ groupId, user }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [postImage, setPostImage] = useState(null);
  const router = useRouter();
  const { subscribe } = useWebSocketContext();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message, type = 'info', duration = 3500) => {
    setToast({ visible: true, message, type, duration });
  };

  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

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
          try {
            const postData = JSON.parse(message.content);
            setPosts(prev => {
              // Avoid duplicates
              if (prev.some(p => p.id === postData.id)) return prev;
              return [postData, ...prev];
            });
          } catch (e) {
            console.error('[GroupPostsSection] Failed to parse new group post data:', e);
          }
        } else if (message.type === 'group_post_like_update') {
          try {
            const likeData = JSON.parse(message.content);
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
      showToast('Please fill in both title and content', 'error');
      return;
    }

    if (!groupId) {
      showToast(`Group ID is missing. Received: ${groupId} (type: ${typeof groupId})`, 'error');
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
      } else {
        const errorText = await response.text();
        showToast(`Failed to create post: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Error creating post', 'error');
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
    <>
      <div className="group-posts-section-modern">
      {/* Modern Create Post Prompt */}
      <div className="create-post-prompt-modern">
        <button
          onClick={() => setShowCreatePost(true)}
          className="create-post-button-modern"
        >
          <div className="create-post-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="create-post-placeholder">What's on your mind? Share with your group...</span>
          <div className="create-post-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
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
        <div className="posts-grid-modern">
          {posts.map(post => (
            <div key={post.id} className="post-card-modern">
              {/* Post Header */}
              <div className="post-header-modern">
                <div className="post-author-modern">
                  {post.avatar_url && post.avatar_url !== '' ? (
                    <img
                      src={post.avatar_url}
                      alt={`${post.username || 'User'}'s avatar`}
                      className="post-avatar-modern"
                      onError={e => { e.target.src = '/img/avatars/images.png'; }}
                    />
                  ) : (
                    <div className="post-avatar-fallback-modern">
                      {post.firstname && post.firstname.length > 0
                        ? post.firstname[0]
                        : (post.username && post.username.length > 0
                            ? post.username[0]
                            : '?')}
                    </div>
                  )}
                  <div className="post-author-info-modern">
                    <h3 className="post-author-name">{post.username || 'Unknown User'}</h3>
                    <div className="post-meta-modern">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="post-body-modern">
                <h2 className="post-title-modern">{post.title}</h2>
                <p className="post-content-modern">{post.content}</p>

                {/* Post Image */}
                {post.image && (
                  <div className="post-image-modern">
                    <img src={post.image} alt="Post image" />
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <div className="post-actions-modern">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`post-action-btn ${post.is_liked ? 'active liked' : ''}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 22V11M2 13v6a2 2 0 002 2h2.4M2 13l6.5-6.5M2 13h6M22 13l-4-9H7l4 9h11zM18 13l-2.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{post.like_count || 0}</span>
                </button>
                
                <button
                  onClick={() => handleDislike(post.id)}
                  className={`post-action-btn ${post.is_disliked ? 'active disliked' : ''}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 2v11M22 11V5a2 2 0 00-2-2h-2.4M22 11l-6.5 6.5M22 11h-6M2 11l4 9h11l-4-9H2zM6 11l2.5-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{post.dislike_count || 0}</span>
                </button>
                
                <button
                  onClick={() => router.push(`/comments?postId=${post.id}&type=group&groupId=${groupId}`)}
                  className="post-action-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{post.comment_count || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={hideToast} duration={toast.duration} />
    </>
  );
}