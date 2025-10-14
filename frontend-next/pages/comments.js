import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function Comments() {
  const router = useRouter();
  const { postId, type, groupId } = router.query;
  const { user, loading: sessionLoading } = useSession();
  const { subscribe } = useWebSocketContext();
  const isGroupPost = type === 'group';
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (postId) {
      fetchCommentsAndPost();
    }
  }, [postId]);

  // Listen for real-time comment updates
  useEffect(() => {
    if (!user || !postId) return;

    const unsubscribe = subscribe((message) => {
      // Listen for both regular and group post comments
      if (message.type === 'new_comment' && message.post_id == postId) {
        // Refresh comments when a new comment is added to this post
        fetchCommentsAndPost();
      } else if (message.type === 'group_post_comment' && message.post_id == postId) {
        // Refresh comments when a new group post comment is added
        console.log('[Comments] Group post comment received, refreshing...');
        fetchCommentsAndPost();
      }
    });

    return () => unsubscribe();
  }, [user, postId, subscribe]);

  const fetchCommentsAndPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
            type: 'group',
            username: 'Group Member',
            createdAt: new Date().toISOString()
          });
        } else {
          setError('Failed to fetch group comments');
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
          setError('Failed to fetch comments');
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Error loading comments');
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

  if (loading || sessionLoading) {
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
              alt={`${post.username || 'User'}'s avatar`}
              className="post-avatar"
            />
            <div className="post-user-info">
              <h3>{post.username || 'Anonymous'}</h3>
              <p className="post-date">
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date'}
              </p>
            </div>
          </div>
          
          <h1 className="post-title">{post.title || 'Untitled Post'}</h1>
          <p className="post-content">{post.content || 'No content available'}</p>
          
          {post.image && (
            <img
              src={post.image}
              alt="Post image"
              className="post-image"
            />
          )}
        </div>

        {/* Add Comment Form */}
        <div className="comment-form">
          <h2>Add a Comment</h2>
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment here..."
              className="comment-textarea"
              rows={3}
              required
            />
            <div className="comment-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                Post Comment
              </button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          <h2 className="comments-section-title">
            Comments ({comments.length})
          </h2>
          
          {comments.length === 0 ? (
            <div className="no-comments">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <img
                    src={comment.userAvatar || '/css/icon.png'}
                    alt={`${comment.username}'s avatar`}
                    className="comment-avatar"
                  />
                  <div className="comment-user-info">
                    <h4>{comment.username || 'Anonymous'}</h4>
                    <p className="post-date">
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
