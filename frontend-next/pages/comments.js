import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';

export default function Comments() {
  const router = useRouter();
  const { postId, type, groupId } = router.query;
  const { user, loading: sessionLoading } = useSession();
  const isGroupPost = type === 'group';
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      fetchCommentsAndPost();
    }
  }, [postId]);

  const fetchCommentsAndPost = async () => {
    try {
      setLoading(true);
      
      if (isGroupPost && groupId) {
        // For group posts, fetch directly from backend
        const response = await fetch(`http://localhost:8080/groups/${groupId}/posts/${postId}/comments`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const commentsData = await response.json();
          setComments(commentsData || []);
          // For group posts, we need to fetch post details separately or set a mock post
          setPost({
            id: postId,
            title: 'Group Post',
            content: 'Loading post details...',
            type: 'group'
          });
        } else {
          console.error('Failed to fetch group comments');
        }
      } else {
        // Regular posts
        const response = await fetch(`/api/comments/${postId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
          setComments(data.comments || []);
        } else {
          console.error('Failed to fetch comments');
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      let response;
      
      if (isGroupPost && groupId) {
        // For group posts, use backend API with FormData
        const formData = new FormData();
        formData.append('group_id', groupId);
        formData.append('group_post_id', postId);
        formData.append('content', newComment.trim());
        
        response = await fetch('http://localhost:8080/groups/comments', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
      } else {
        // Regular posts
        response = await fetch('/api/comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: parseInt(postId),
            content: newComment.trim()
          }),
          credentials: 'include'
        });
      }

      if (response.ok) {
        setNewComment('');
        fetchCommentsAndPost(); // Refresh comments
      } else {
        console.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  if (loading || userLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Loading comments...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="error-text">{error}</div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-text">Post not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Comments - {post.title}</title>
      </Head>
      
      <div className="comments-container">
        <button 
          onClick={() => router.back()}
          className="back-button"
        >
          ← Back to Posts
        </button>

        {/* Original Post */}
        <div className="post-detail">
          <div className="post-header">
            <img
              src={post.userAvatar || '/css/icon.png'}
              alt={`${post.username}'s avatar`}
              className="post-avatar"
            />
            <div className="post-user-info">
              <h3>{post.username}</h3>
              <p className="post-date">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <h1 className="post-title">{post.title}</h1>
          <p className="post-content">{post.content}</p>
          
          {post.image && (
            <img
              src={post.image}
              alt="Post image"
              className="post-image"
            />
          )}
        </div>

        {/* Add Comment Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add a Comment</h2>
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment here..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Post Comment
              </button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Comments ({comments.length})
          </h2>
          
          {comments.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <p className="text-gray-600">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={comment.userAvatar || '/css/icon.png'}
                    alt={`${comment.username}'s avatar`}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{comment.username}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
