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
            console.log(`✨ New post from ${message.username}: ${postData.title}`);
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
            console.log(`✨ New group post from ${message.username}: ${groupPostData.title}`);
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
        <title>Posts - Social Network</title>
      </Head>
      
      <div className={`posts-layout ${chatOpen ? 'chat-open' : ''}`}>
        {/* Main Content */}
        <div className="posts-main-content">
          <div className="posts-header">
            <button 
              className="button-create"
              onClick={() => router.push('/createPost')}
            >
              Create New Post
            </button>
          </div>

          {/* Posts Container */}
          <div className="posts-container">
            {loading ? (
              <div className="loading-message">
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="no-posts-message">
                <p>No posts found</p>
                <p>Try creating a new post</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-author">
                      {post.avatar_url && post.avatar_url !== '/img/avatars/images.png' && post.avatar_url !== '' ? (
                        <img
                          src={post.avatar_url}
                          alt={`${post.username}'s avatar`}
                          className="post-avatar"
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb', background: '#f3f4f6' }}
                          onError={e => { e.target.src = '/img/avatars/images.png'; }}
                        />
                      ) : (
                        <div
                          className="post-avatar-fallback"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            border: '2px solid #e5e7eb',
                            textTransform: 'uppercase',
                          }}
                        >
                          {post.firstname && post.firstname.length > 0
                            ? post.firstname[0]
                            : (post.username && post.username.length > 0
                                ? post.username[0]
                                : '?')}
                        </div>
                      )}
                      <div className="post-author-info">
                        <h3>{post.username}</h3>
                        <p className="post-meta">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {post.category && (
                      <span className="post-category">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <h2>{post.title}</h2>
                  <p className="post-content">{post.content}</p>

                  {post.image && (
                    <div className="post-image-container">
                      <img
                        src={post.image}
                        alt="Post image"
                      />
                    </div>
                  )}

                  <div className="post-actions">
                    <div className="like-buttons">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="icon-btn like-btn"
                      >
                        👍 Like ({post.likes_count || 0})
                      </button>
                      <button
                        onClick={() => handleDislike(post.id)}
                        className="icon-btn dislike-btn"
                      >
                        👎 Dislike ({post.dislikes_count || 0})
                      </button>
                      <button
                        onClick={() => router.push(`/comments?postId=${post.id}`)}
                        className="icon-btn comment-btn"
                      >
                        💬 Comments ({post.comments || 0})
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
