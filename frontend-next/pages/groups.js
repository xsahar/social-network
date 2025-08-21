import Head from 'next/head';
import { useEffect } from 'react';

export default function Groups() {
  useEffect(() => {
    // Check session when component mounts
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = '/js/groups.js';
      script.onload = () => {
        console.log('Groups script loaded');
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  return (
    <>
      <Head>
        <title>Groups - Social Network</title>
        <meta name="description" content="Browse and join groups" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/notification-dot.css" />
        <link rel="stylesheet" href="/css/invite-users.css" />
      </Head>

      <div className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <a href="/posts">SocialNet</a>
          </div>
          <div className="nav-menu">
            <a href="/posts" className="nav-link">Posts</a>
            <a href="/groups" className="nav-link active">Groups</a>
            <a href="/myProfile" className="nav-link">Profile</a>
            <a href="/createPost" className="nav-link">Create Post</a>
            <button id="logout-btn" className="nav-link logout-btn">Logout</button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="groups-header">
          <h1>Groups</h1>
          <button id="create-group-btn" className="btn btn-primary">Create Group</button>
        </div>

        {/* Create Group Modal */}
        <div id="create-group-modal" className="modal" style={{ display: 'none' }}>
          <div className="modal-content">
            <span className="close">&times;</span>
            <h2>Create New Group</h2>
            <form id="create-group-form">
              <div className="form-group">
                <label htmlFor="group-title">Group Title:</label>
                <input type="text" id="group-title" name="title" required />
              </div>
              <div className="form-group">
                <label htmlFor="group-description">Description:</label>
                <textarea id="group-description" name="description" rows="4" required></textarea>
              </div>
              <div className="form-group">
                <button type="submit" className="btn btn-primary">Create Group</button>
                <button type="button" className="btn btn-secondary" id="cancel-create">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        {/* Groups Section */}
        <div className="groups-section">
          <div className="tabs">
            <button className="tab-button active" data-tab="all-groups">All Groups</button>
            <button className="tab-button" data-tab="my-groups">My Groups</button>
            <button className="tab-button" data-tab="invitations">Invitations</button>
            <button className="tab-button" data-tab="pending-approvals">
              Pending Approvals
              <span id="pending-requests-indicator" className="notification-dot" style={{ display: 'none' }}></span>
            </button>
          </div>

          <div id="all-groups" className="tab-content active">
            <h2>All Groups</h2>
            <div id="groups-list" className="groups-grid">
              {/* Groups will be loaded here */}
            </div>
          </div>

          <div id="my-groups" className="tab-content">
            <h2>My Groups</h2>
            <div id="user-groups-list" className="groups-grid">
              {/* User's groups will be loaded here */}
            </div>
          </div>

          <div id="invitations" className="tab-content">
            <h2>Group Invitations</h2>
            <div id="invitations-list" className="invitations-list">
              {/* Invitations will be loaded here */}
            </div>
          </div>

          <div id="pending-approvals" className="tab-content">
            <h2>Pending Join Requests</h2>
            <div id="pending-approvals-list" className="invitations-list">
              {/* Pending join requests will be loaded here */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
