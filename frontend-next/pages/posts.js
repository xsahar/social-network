import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useChat } from '../hooks/useChat';

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState([]);
  const { user, loading: sessionLoading } = useSession();
  const { onlineUsers, subscribe } = useWebSocketContext();
  const { chatOpen, chatWith, startChat, setChatOpen } = useChat();
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle null or undefined data gracefully
        setPosts(data?.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingUsers = async () => {
    try {
      const response = await fetch('/api/user-followers', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setFollowingUsers(data?.following || []);
      }
    } catch (error) {
      console.error('Failed to fetch following users:', error);
      setFollowingUsers([]);
    }
  };

  // Listen for real-time post updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe((message) => {
      console.log('[Posts] Received WebSocket message:', message);


      // Handle normal post creation
      if (message.type === 'new_post') {
        try {
          const postData = JSON.parse(message.content);
          // If the post is from the current user and avatar_url is missing, inject user's avatar
          let postWithAvatar = postData;
          if (user && message.from === user.userID && (!postData.avatar_url || postData.avatar_url === '' || postData.avatar_url === '/img/avatars/images.png')) {
            postWithAvatar = { ...postData, avatar_url: user.avatar };
          }
          setPosts(prev => {
            // If post already exists, update avatar_url if needed (for all users)
            if (prev.some(p => p.id === postWithAvatar.id)) {
              return prev.map(p =>
                p.id === postWithAvatar.id && (!p.avatar_url || p.avatar_url === '' || p.avatar_url === '/img/avatars/images.png')
                  ? { ...p, avatar_url: postWithAvatar.avatar_url }
                  : p
              );
            }
            return [postWithAvatar, ...prev];
          });
          if (message.username && message.from !== user.userID) {
            console.log(`New post from ${message.username}: ${postData.title}`);
          }
        } catch (e) {
          console.error('[Posts] Failed to parse post data:', e);
        }
      }

      // Handle group post creation in real-time
      else if (message.type === 'new_groupPost') {
        try {
          const groupPostData = JSON.parse(message.content);
          let groupPostWithAvatar = groupPostData;
          if (user && message.from === user.userID && (!groupPostData.avatar_url || groupPostData.avatar_url === '' || groupPostData.avatar_url === '/img/avatars/images.png')) {
            groupPostWithAvatar = { ...groupPostData, avatar_url: user.avatar };
          }
          setPosts(prev => {
            // If post already exists, update avatar_url if needed (for all users)
            if (prev.some(p => p.id === groupPostWithAvatar.id)) {
              return prev.map(p =>
                p.id === groupPostWithAvatar.id && (!p.avatar_url || p.avatar_url === '' || p.avatar_url === '/img/avatars/images.png')
                  ? { ...p, avatar_url: groupPostWithAvatar.avatar_url }
                  : p
              );
            }
            return [groupPostWithAvatar, ...prev];
          });
          if (message.username && message.from !== user.userID) {
            console.log(`New group post from ${message.username}: ${groupPostData.title}`);
          }
        } catch (e) {
          console.error('[Posts] Failed to parse group post data:', e);
        }
      }

      // Handle like updates
      else if (message.type === 'new_postLike') {
        try {
          const likeData = JSON.parse(message.content);
          setPosts(prev => prev.map(post => 
            post.id === likeData.post_id 
              ? { 
                  ...post, 
                  likes_count: likeData.likes_count,
                  dislikes_count: likeData.dislikes_count 
                }
              : post
          ));
        } catch (e) {
          console.error('[Posts] Failed to parse like data:', e);
        }
      }

      // Handle comment updates
      else if (message.type === 'new_comment' && message.post_id) {
        setPosts(prev => prev.map(post => 
          post.id === message.post_id 
            ? { ...post, comments: (post.comments || 0) + 1 }
            : post
        ));
      }
    });

    return () => unsubscribe();
  }, [user, subscribe]);

  const handleLike = async (postId) => {
    try {
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: postId,
          is_like: true
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state immediately with the response data
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes_count: data.likes,
                dislikes_count: data.dislikes 
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleDislike = async (postId) => {
    try {
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: postId,
          is_like: false
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state immediately with the response data
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes_count: data.likes,
                dislikes_count: data.dislikes 
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to dislike post:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchFollowingUsers();
  }, []);



  if (sessionLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Posts - Discover Amazing Content</title>
        <meta name="description" content="Explore incredible stories from your community!" />
      </Head>
      
      <div className="posts-page-bg">
        <div className={`posts-layout ${chatOpen ? 'chat-open' : ''}`}>
          {/* Professional Main Content */}
          <div className="posts-main-content container-professional">
            
            {/* Modern Posts Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl mb-6 animate-float">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-gentle-rotate">
                  <div className="text-white text-xl font-bold">P</div>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gradient mb-4">
                Discover Amazing Stories!
              </h1>
              
              <p className="text-lg text-gray-700 font-medium mb-8 max-w-2xl mx-auto">
                Explore incredible content from your vibrant community! Every story matters and inspires others.
              </p>
              
              <button 
                className="button-create group relative overflow-hidden"
                onClick={() => router.push('/createPost')}
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
                }}
              >
                Create New Post
                
                {/* Button decoration */}
                <div className="absolute top-1 right-2 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
              </button>
            </div>

            {/* Professional Posts Container */}
            <div className="posts-container">
              {loading ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-12 shadow-xl border border-white/30 text-center animate-pulse">
                  <div className="text-6xl mb-6 animate-spin flex items-center justify-center" style={{animationDuration: '2s'}}>
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-4">Loading amazing stories...</h3>
                  <p className="text-lg text-gray-600">Preparing incredible content for you!</p>
                  <div className="loading-spinner mt-6"></div>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-16 shadow-xl border border-white/30 text-center relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-6 h-6 bg-yellow-400 rounded-full opacity-20 animate-float"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 bg-purple-400 rounded-full opacity-15 animate-bounce"></div>
                  
                  <div className="text-8xl mb-8 animate-float flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <div className="text-white text-4xl font-bold">+</div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">No posts yet!</h3>
                  <p className="text-xl text-gray-600 mb-8">
                    Be the first to share something <span className="font-bold text-gradient">amazing</span>!
                  </p>
                  <button 
                    onClick={() => router.push('/createPost')}
                    className="btn btn-primary btn-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : (
              posts.map((post) => (
                <div key={post.id} className="enhanced-post-card">
                  {/* Post Card Header */}
                  <div className="enhanced-post-header">
                    <div className="enhanced-post-author">
                      {post.avatar_url && post.avatar_url !== '/img/avatars/images.png' && post.avatar_url !== '' ? (
                        <img
                          src={post.avatar_url}
                          alt={`${post.username}'s avatar`}
                          className="enhanced-post-avatar"
                          onError={e => { e.target.src = '/img/avatars/images.png'; }}
                        />
                      ) : (
                        <div className="enhanced-post-avatar-fallback">
                          {post.firstname && post.firstname.length > 0
                            ? post.firstname[0]
                            : (post.username && post.username.length > 0
                                ? post.username[0]
                                : '?')}
                        </div>
                      )}
                      <div className="enhanced-post-author-info">
                        <h3 className="enhanced-post-username">{post.username}</h3>
                        <p className="enhanced-post-date">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {post.category && (
                      <span className="enhanced-post-category">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="enhanced-post-body">
                    <h2 className="enhanced-post-title">{post.title}</h2>
                    <p className="enhanced-post-content">{post.content}</p>

                    {post.image && (
                      <div className="enhanced-post-image-container">
                        <img
                          src={post.image}
                          alt="Post image"
                          className="enhanced-post-image"
                        />
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="enhanced-post-actions">
                    <div className="enhanced-action-buttons">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="enhanced-action-btn like-btn-enhanced"
                      >
                        <div className="action-icon">+</div>
                        <span>Like ({post.likes_count || 0})</span>
                      </button>
                      <button
                        onClick={() => handleDislike(post.id)}
                        className="enhanced-action-btn dislike-btn-enhanced"
                      >
                        <div className="action-icon">-</div>
                        <span>Dislike ({post.dislikes_count || 0})</span>
                      </button>
                      <button
                        onClick={() => router.push(`/comments?postId=${post.id}`)}
                        className="enhanced-action-btn comment-btn-enhanced"
                      >
                        <div className="action-icon">C</div>
                        <span>Comments ({post.comments || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Chat with Following Users */}
        {user && (
          <div className="chat-sidebar">
            <h3 className="chat-sidebar-title">
              Chat ({followingUsers.length})
            </h3>
            <div className="chat-users-list">
              {followingUsers.length > 0 ? (
                followingUsers.map((followingUser) => {
                  const isOnline = onlineUsers.some(u => u.id === followingUser.id);
                  return (
                    <div key={followingUser.id} className="chat-user-item">
                      <div className="chat-user-info">
                        <div className={`chat-status-dot ${isOnline ? 'online' : 'offline'}`}></div>
                        <span className="chat-username">{followingUser.username}</span>
                      </div>
                      <button
                        onClick={() => startChat(followingUser)}
                        className="chat-button"
                      >
                        Chat
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="chat-empty-state">
                  <p>No users to chat with</p>
                  <p className="chat-empty-subtext">Follow users to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div> {/* Close posts-page-bg */}

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
