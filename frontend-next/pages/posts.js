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
  const [selectedCategory, setSelectedCategory] = useState('');
  const { user, loading: sessionLoading } = useSession();
  const { onlineUsers, subscribe } = useWebSocketContext();
  const { chatOpen, chatWith, startChat, setChatOpen } = useChat();
  const router = useRouter();

  const handleCategoryClick = (value) => {
    setSelectedCategory(value);
    router.push(`/posts?category=${value}`);
  };

  const fetchPosts = async (category = '') => {
    try {
      setLoading(true);
      const url = category 
        ? `/api/posts?category=${category}`
        : '/api/posts';
      
      const response = await fetch(url, {
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

  // Listen for real-time post updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe((message) => {
      console.log('[Posts] Received WebSocket message:', message);
      
      if (message.type === 'new_post') {
        // Parse the post data from the message content
        try {
          const postData = JSON.parse(message.content);
          console.log('[Posts] New post data:', postData);
          
          // Add new post to the top of the feed
          setPosts(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === postData.id)) {
              return prev;
            }
            return [postData, ...prev];
          });
          
          // Show notification
          if (message.username && message.from !== user.userID) {
            console.log(`✨ New post from ${message.username}: ${postData.title}`);
          }
        } catch (e) {
          console.error('[Posts] Failed to parse post data:', e);
        }
      } else if (message.type === 'new_postLike' && message.post_id) {
        // Update like count for specific post
        setPosts(prev => prev.map(post => 
          post.id === message.post_id 
            ? { 
                ...post, 
                likes_count: message.likes_count,
                dislikes_count: message.dislikes_count 
              }
            : post
        ));
      } else if (message.type === 'new_comment' && message.post_id) {
        // Update comment count for specific post
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
        // Refresh posts to get updated like count
        fetchPosts(selectedCategory);
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
        // Refresh posts to get updated dislike count
        fetchPosts(selectedCategory);
      }
    } catch (error) {
      console.error('Failed to dislike post:', error);
    }
  };

  useEffect(() => {
    const { category } = router.query;
    if (category) {
      setSelectedCategory(category);
      fetchPosts(category);
    } else {
      fetchPosts();
    }
  }, [router.query]);



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
      
      <div className="posts-layout">
        {/* Left Sidebar - Categories */}
        <div className="sidebar-post left-sidebar">
          <h2>Filter Posts</h2>
          
          <div className="category-list">
            <button 
              onClick={() => handleCategoryClick('')}
              className={`button-side ${selectedCategory === '' ? 'active' : ''}`}
            >
              All Posts
            </button>
            {['Travel', 'Sport', 'Food', 'Nature'].map((category) => (
              <button 
                key={category} 
                className={`button-side ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="sidebar-actions">
            <button 
              className="button-side"
              onClick={() => router.push('/myProfile')}
            >
              My Profile
            </button>
            <button 
              className="button-side"
              onClick={() => router.push('/createPost')}
            >
              Create Post
            </button>
          </div>
        </div>

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
                {selectedCategory && (
                  <p>Try selecting a different category or create a new post</p>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-author">
                      <img
                        src={post.userAvatar || '/css/icon.png'}
                        alt={`${post.username}'s avatar`}
                        className="post-avatar"
                      />
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

        {/* Right Sidebar - Online Users */}
        {user && (
          <div className="w-64 bg-white rounded-lg shadow-lg p-6 h-fit">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Online Users ({onlineUsers.length})
            </h3>
            <div className="space-y-2">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">{user.username}</span>
                    </div>
                    <button
                      onClick={() => startChat(user)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Chat
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">No users online</p>
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
