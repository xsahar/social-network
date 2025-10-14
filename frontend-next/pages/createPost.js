import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useSession } from '../hooks/useSession';

export default function CreatePost() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    privacy: 'public',
    image: null,
    selectedFollowers: []
  });
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const categories = ['Travel', 'Sport', 'Food', 'Nature'];
  const privacyOptions = [
    { value: 'public', label: 'Public', description: 'Everyone can see' },
    { value: 'almost-private', label: 'Almost Private', description: 'Only followers' },
    { value: 'private', label: 'Private', description: 'Selected followers only' }
  ];

  // Fetch followers when privacy is set to private
  useEffect(() => {
    if (formData.privacy === 'private') {
      fetchFollowers();
    }
  }, [formData.privacy]);

  const fetchFollowers = async () => {
    try {
      const response = await fetch('/api/user-followers', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const handleChange = (e) => {
    if (e.target.type === 'file') {
      setFormData({
        ...formData,
        [e.target.name]: e.target.files[0]
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleFollowerToggle = (followerId) => {
    setFormData(prev => {
      const selected = prev.selectedFollowers.includes(followerId)
        ? prev.selectedFollowers.filter(id => id !== followerId)
        : [...prev.selectedFollowers, followerId];
      return { ...prev, selectedFollowers: selected };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate private post has selected followers
    if (formData.privacy === 'private' && formData.selectedFollowers.length === 0) {
      setError('Please select at least one follower for private posts');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('category', formData.category);
      
      // Convert privacy to numeric level
      let privacyLevel = 0;
      if (formData.privacy === 'almost-private') privacyLevel = 1;
      if (formData.privacy === 'private') privacyLevel = 2;
      formDataToSend.append('privacy_level', privacyLevel);

      // Add selected followers for private posts
      if (formData.privacy === 'private') {
        formData.selectedFollowers.forEach(id => {
          formDataToSend.append('selected_followers', id);
        });
      }

      if (formData.image) {
        formDataToSend.append('imgOrgif', formData.image);
      }

      const response = await fetch('/api/create-post', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include'
      });

      if (response.ok) {
        router.push('/posts?message=Post created successfully');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Create post error:', err);
    } finally {
      setLoading(false);
    }
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
        <title>Create Post - SocialNet</title>
      </Head>
      
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium"
          >
            ← Back to Posts
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a New Post</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
                            <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter post title"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
                            <textarea
                id="content"
                name="content"
                rows="6"
                value={formData.content}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="What's on your mind?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
                            <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select a category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Privacy Setting *
              </label>
              <div className="space-y-3">
                {privacyOptions.map((option) => (
                  <label key={option.value} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      id={option.value}
                      name="privacy"
                      value={option.value}
                      checked={formData.privacy === option.value}
                      onChange={handleChange}
                      className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Follower Selector for Private Posts */}
            {formData.privacy === 'private' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Followers * (Choose who can see this post)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {followers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      You have no followers yet. Set post to "Almost Private" to allow future followers to see it.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {followers.map((follower) => (
                        <label 
                          key={follower.id} 
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedFollowers.includes(follower.id)}
                            onChange={() => handleFollowerToggle(follower.id)}
                            className="mr-3 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {follower.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900">{follower.username}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formData.selectedFollowers.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    {formData.selectedFollowers.length} follower(s) selected
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                Image or GIF (Optional)
              </label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">Supports JPEG, PNG, and GIF formats (max 10MB)</p>
              
              {/* Image Preview */}
              {formData.image && (
                <div className="mt-3 relative inline-block">
                  <img 
                    src={URL.createObjectURL(formData.image)} 
                    alt="Preview" 
                    className="max-w-xs max-h-48 rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, image: null})}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Post...
                  </div>
                ) : (
                  'Create Post'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/posts')}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
