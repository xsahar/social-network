import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWith, setChatWith] = useState(null);
  const { user, loading: sessionLoading } = useSession();
  const { onlineUsers } = useWebSocket(user?.userID);
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
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const startChat = (user) => {
    setChatWith(user);
    setChatOpen(true);
  };

  if (sessionLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Posts - Social Network</title>
      </Head>
      
      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        <div className="w-64 bg-white rounded-lg shadow-lg p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filter Posts</h2>
          
          <div className="space-y-2">
            <button 
              onClick={() => handleCategoryClick('')}
              className={`w-full px-4 py-2 text-left rounded-md transition-colors ${selectedCategory === '' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'}`}
            >
              All Posts
            </button>
            {['Travel', 'Sport', 'Food', 'Nature'].map((category) => (
              <button 
                key={category} 
                className={`w-full px-4 py-2 text-left rounded-md transition-colors ${selectedCategory === category ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'}`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="mt-6 space-y-2">
            <button 
              className="w-full px-4 py-2 text-left rounded-md transition-colors text-gray-700 hover:bg-blue-50"
              onClick={() => router.push('/myProfile')}
            >
              My Profile
            </button>
            <button 
              className="w-full px-4 py-2 text-left rounded-md transition-colors text-gray-700 hover:bg-blue-50"
              onClick={() => router.push('/createPost')}
            >
              Create Post
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-6">
            <button 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              onClick={() => router.push('/createPost')}
            >
              Create New Post
            </button>
          </div>

          {/* Posts Container */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow">
                <p className="text-gray-600">No posts found</p>
                {selectedCategory && (
                  <p className="text-sm text-gray-500 mt-2">
                    Try selecting a different category or create a new post
                  </p>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={post.userAvatar || '/css/icon.png'}
                        alt={`${post.username}'s avatar`}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{post.username}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {post.category && (
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
                  <p className="text-gray-700 mb-4">{post.content}</p>

                  {post.image && (
                    <img
                      src={post.image}
                      alt="Post image"
                      className="w-full max-w-lg rounded-lg mb-4"
                    />
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors px-3 py-1 rounded-md hover:bg-green-50"
                      >
                        <span>👍 Like</span>
                        <span>({post.likes_count || 0})</span>
                      </button>
                      <button
                        onClick={() => handleDislike(post.id)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-1 rounded-md hover:bg-red-50"
                      >
                        <span>👎 Dislike</span>
                        <span>({post.dislikes_count || 0})</span>
                      </button>
                      <button
                        onClick={() => router.push(`/comments?postId=${post.id}`)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                      >
                        <span>💬 Comments</span>
                        <span>({post.comments || 0})</span>
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
