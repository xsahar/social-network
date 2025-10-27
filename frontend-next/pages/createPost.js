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
        <title>Create Post - Share Your Story</title>
        <meta name="description" content="Create amazing content and inspire your community!" />
      </Head>
      
      <div className="posts-page-bg min-h-screen">
        <div className="container-professional">
          
          {/* Professional Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl mb-8 animate-float animate-pulse-glow">
              <div 
                className="w-16 h-16 rounded-2xl animate-gentle-rotate"
                style={{ background: 'var(--gradient-cosmic)' }}
              />
            </div>
            
            <h1 className="text-5xl font-bold text-gradient mb-6">
              Create Something Amazing
            </h1>
            
            <p className="text-xl text-gray-700 font-medium mb-8 max-w-2xl mx-auto">
              Share your <span className="font-bold text-gradient">brilliant thoughts</span> with the world! 
              Every story matters and inspires others.
            </p>
            
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-3 text-gray-600 hover:text-blue-600 font-bold text-lg transition-all duration-300 hover:underline decoration-2 underline-offset-4 mb-8"
            >
              Back to Posts
            </button>
          </div>

          {/* Ultra-Professional Form Container */}
          <div 
            className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 relative overflow-hidden max-w-4xl mx-auto"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 100px rgba(102, 126, 234, 0.1)' 
            }}
          >
            {/* Top gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'var(--gradient-cosmic)' }}></div>
            
            {/* Floating decorations */}
            <div className="absolute top-6 right-6 w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-15 animate-spin" style={{animationDuration: '15s'}}></div>
            <div className="absolute bottom-8 left-8 w-6 h-6 bg-gradient-to-r from-pink-400 to-red-500 rounded-full opacity-20 animate-bounce"></div>
            
            <div className="p-12">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Share Your Story
                </h2>
                <p className="text-lg text-gray-600 font-medium">Create content that sparks joy and inspires others!</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-8">
                  
                  {/* Title Field - Professional Design */}
                  <div className="space-y-4">
                    <label htmlFor="title" className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg font-bold shadow-lg">
                        ✏️
                      </span>
                      Post Title <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="relative w-full px-8 py-6 border-3 border-gray-300 rounded-2xl bg-white font-bold text-xl transition-all duration-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:shadow-2xl outline-none hover:border-purple-400 hover:shadow-lg"
                        placeholder="Give your story an amazing title..."
                        style={{ borderWidth: '3px' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-purple-50 px-4 py-3 rounded-xl">
                      <span className="text-purple-500">💡</span>
                      <span className="font-medium">Make it catchy and inspiring!</span>
                    </div>
                  </div>

                  {/* Content Field - Enhanced Textarea */}
                  <div className="space-y-4">
                    <label htmlFor="content" className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-lg font-bold shadow-lg">
                        📝
                      </span>
                      Post Content <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>
                      <textarea
                        id="content"
                        name="content"
                        rows="8"
                        value={formData.content}
                        onChange={handleChange}
                        required
                        className="relative w-full px-8 py-6 border-3 border-gray-300 rounded-2xl bg-white font-semibold text-lg transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-2xl outline-none hover:border-blue-400 hover:shadow-lg resize-none"
                        placeholder="What's on your mind? Share your inspiration, thoughts, dreams..."
                        style={{ borderWidth: '3px' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-xl">
                      <span className="text-blue-500">✨</span>
                      <span className="font-medium">Express yourself freely! Your voice matters.</span>
                    </div>
                  </div>

                  {/* Category Field - Beautiful Selector */}
                  <div className="space-y-4">
                    <label className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-bold shadow-lg">
                        🏷️
                      </span>
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="relative w-full px-8 py-6 border-3 border-gray-300 rounded-2xl bg-white font-bold text-lg transition-all duration-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:shadow-2xl outline-none hover:border-green-400 hover:shadow-lg cursor-pointer"
                        style={{ borderWidth: '3px' }}
                      >
                        <option value="">Select a category...</option>
                        <option value="Travel">🌍 Travel</option>
                        <option value="Sport">⚽ Sports</option>
                        <option value="Food">🍕 Food</option>
                        <option value="Nature">🌿 Nature</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-3 rounded-xl">
                      <span className="text-green-500">🎯</span>
                      <span className="font-medium">Help people discover your amazing content!</span>
                    </div>
                  </div>

                  {/* Privacy Settings - Ultra-Modern */}
                  <div className="space-y-6">
                    <label className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white text-lg font-bold shadow-lg">
                        🔒
                      </span>
                      Privacy Setting <span className="text-red-500">*</span>
                    </label>
                    
                    <div className="grid gap-5">
                      {privacyOptions.map((option) => {
                        const isSelected = formData.privacy === option.value;
                        const gradients = {
                          'public': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          'almost-private': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          'private': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                        };
                        const icons = {
                          'public': '🌍',
                          'almost-private': '👥',
                          'private': '🔐'
                        };
                        
                        return (
                          <label 
                            key={option.value} 
                            className={`relative flex items-center p-6 rounded-2xl cursor-pointer transition-all duration-300 border-3 backdrop-blur-sm group ${
                              isSelected 
                                ? 'border-transparent shadow-2xl scale-105 ring-4' 
                                : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg hover:scale-[1.02]'
                            }`}
                            style={{
                              background: isSelected ? gradients[option.value] : 'white',
                              borderWidth: '3px',
                              ringColor: isSelected ? (option.value === 'public' ? '#10b98120' : option.value === 'almost-private' ? '#3b82f620' : '#f59e0b20') : 'transparent'
                            }}
                          >
                            <input
                              type="radio"
                              id={option.value}
                              name="privacy"
                              value={option.value}
                              checked={isSelected}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            
                            <div className="flex items-center gap-6 relative z-10 w-full">
                              <div 
                                className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-all duration-300 ${
                                  isSelected ? 'scale-110 shadow-lg bg-white/20' : 'bg-gray-100 group-hover:scale-105'
                                }`}
                              >
                                {icons[option.value]}
                              </div>
                              
                              <div className="flex-1">
                                <div className={`text-xl font-black mb-2 ${
                                  isSelected ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {option.label}
                                </div>
                                <div className={`text-base font-semibold ${
                                  isSelected ? 'text-white/90' : 'text-gray-600'
                                }`}>
                                  {option.description}
                                </div>
                              </div>
                              
                              {isSelected && (
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-orange-50 px-4 py-3 rounded-xl">
                      <span className="text-orange-500">👀</span>
                      <span className="font-medium">Choose who gets to see your amazing content!</span>
                    </div>
                  </div>

            {/* Follower Selector for Private Posts */}
            {formData.privacy === 'private' && (
              <div className="space-y-4">
                <label className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg font-bold shadow-lg">
                    👥
                  </span>
                  Select Followers <span className="text-red-500">*</span>
                </label>
                <div className="border-3 border-indigo-300 rounded-2xl p-6 max-h-80 overflow-y-auto bg-gradient-to-br from-indigo-50 to-purple-50" style={{ borderWidth: '3px' }}>
                  {followers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">😔</div>
                      <p className="text-lg font-bold text-gray-700 mb-2">
                        No followers yet!
                      </p>
                      <p className="text-sm text-gray-600 font-medium">
                        Set post to "Almost Private" to allow future followers to see it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followers.map((follower) => (
                        <label 
                          key={follower.id} 
                          className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                            formData.selectedFollowers.includes(follower.id)
                              ? 'bg-white border-indigo-500 shadow-lg scale-[1.02]'
                              : 'bg-white/60 border-gray-200 hover:bg-white hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedFollowers.includes(follower.id)}
                            onChange={() => handleFollowerToggle(follower.id)}
                            className="w-5 h-5 mr-4 text-indigo-600 focus:ring-indigo-500 rounded border-2"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {follower.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-base font-bold text-gray-900">{follower.username}</span>
                          </div>
                          {formData.selectedFollowers.includes(follower.id) && (
                            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {formData.selectedFollowers.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <p className="text-base font-bold text-green-800">
                      {formData.selectedFollowers.length} follower(s) selected
                    </p>
                  </div>
                )}
              </div>
            )}

                  {/* Modern Compact File Upload */}
                  <div className="space-y-4">
                    <label className="block text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white text-lg font-bold shadow-lg">
                        🖼️
                      </span>
                      Add Image <span className="text-gray-500 font-normal text-sm">(Optional)</span>
                    </label>
                    
                    {!formData.image ? (
                      /* Upload Button */
                      <div className="relative">
                        <label 
                          htmlFor="image"
                          className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 cursor-pointer transition-all duration-300 hover:shadow-lg"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-purple-700 transition-colors">
                              Click to upload an image
                            </h4>
                            <p className="text-sm text-gray-600 font-medium">
                              Supports: JPEG, PNG, GIF (Max 10MB)
                            </p>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-purple-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </label>
                        
                        <input
                          type="file"
                          id="image"
                          name="image"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          onChange={handleChange}
                          className="sr-only"
                        />
                      </div>
                    ) : (
                      /* Image Preview Card */
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-300 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                        
                        <div className="flex items-start gap-4">
                          {/* Image Thumbnail */}
                          <div className="flex-shrink-0 relative group">
                            <div className="w-24 h-24 rounded-xl overflow-hidden shadow-md border-2 border-white">
                              <img 
                                src={URL.createObjectURL(formData.image)} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors duration-200"></div>
                          </div>
                          
                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <h4 className="text-base font-bold text-green-800">Image uploaded!</h4>
                              </div>
                            </div>
                            
                            <p className="text-sm text-green-700 font-medium mb-3 truncate">
                              {formData.image.name}
                            </p>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({...formData, image: null})}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-300 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-50 hover:border-red-400 transition-all duration-200 shadow-sm hover:shadow"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>
                              
                              <label 
                                htmlFor="image-replace"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Replace
                              </label>
                              <input
                                type="file"
                                id="image-replace"
                                name="image"
                                accept="image/jpeg,image/jpg,image/png,image/gif"
                                onChange={handleChange}
                                className="sr-only"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Professional Error Display */}
                  {error && (
                    <div className="bg-red-50/90 backdrop-blur-lg border-2 border-red-200 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">!</div>
                        <div>
                          <h4 className="text-lg font-bold text-red-800 mb-1">Error</h4>
                          <p className="text-red-700 font-semibold">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ULTIMATE SUBMIT BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-6 pt-10">
                    {/* Create Post Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 text-white py-7 px-10 rounded-2xl font-black text-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group shadow-2xl hover:shadow-[0_35px_70px_-15px_rgba(59,130,246,0.6)]"
                      style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        transform: 'perspective(1000px)',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(-8px) scale(1.02) perspective(1000px) rotateX(2deg)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(0) scale(1) perspective(1000px) rotateX(0deg)';
                        }
                      }}
                    >
                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Premium Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500"></div>
                      
                      {/* Button Content */}
                      <div className="relative z-10 flex items-center justify-center gap-4">
                        {loading ? (
                          <>
                            <div className="w-7 h-7 border-4 border-white border-b-transparent rounded-full animate-spin" />
                            <span className="text-xl font-black tracking-wider">Creating Post...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-black tracking-wider">Create Post</span>
                            <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </>
                        )}
                      </div>
                      
                      {/* Floating particles */}
                      <div className="absolute top-3 right-5 w-2 h-2 bg-white/30 rounded-full animate-bounce opacity-70"></div>
                      <div className="absolute bottom-3 left-7 w-2 h-2 bg-white/30 rounded-full animate-pulse opacity-60"></div>
                      <div className="absolute top-1/2 right-10 w-1 h-1 bg-white/40 rounded-full animate-ping opacity-50"></div>
                    </button>
                    
                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={() => router.push('/posts')}
                      className="sm:w-auto px-10 py-7 bg-white border-3 border-gray-300 text-gray-800 rounded-2xl font-black text-xl transition-all duration-500 hover:bg-gray-50 hover:border-gray-400 hover:shadow-xl hover:scale-105 shadow-lg relative overflow-hidden group"
                      style={{ borderWidth: '3px', textTransform: 'uppercase', letterSpacing: '1px' }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-4px) scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0) scale(1)';
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </span>
                    </button>
                  </div>
                  
                </div>
              </form>
              
              {/* Inspirational Footer */}
              <div className="text-center mt-12 p-6 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 rounded-2xl">
                <p className="text-lg font-medium text-gray-600">
                  Your story has the power to inspire the world!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
