import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function GroupDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitableUsers, setInvitableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id);
    }
  }, [id]);

  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await fetch(`http://localhost:8080/group-details/${groupId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const groupData = await response.json();
        setGroup(groupData);
      } else {
        console.error('Failed to fetch group details');
        router.push('/groups');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      router.push('/groups');
    } finally {
      setLoading(false);
    }
  };
  
  const loadInvitableUsers = async () => {
    if (!id) return;
    
    setLoadingUsers(true);
    try {
      const response = await fetch(`http://localhost:8080/get-invitable-users/${id}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const users = await response.json();
        setInvitableUsers(users);
      } else {
        console.error('Failed to fetch invitable users');
        alert('Error loading users');
      }
    } catch (error) {
      console.error('Error fetching invitable users:', error);
      alert('Error loading users');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const openInviteModal = () => {
    setShowInviteModal(true);
    loadInvitableUsers();
  };
  
  const inviteUser = async (userId) => {
    try {
      const response = await fetch('http://localhost:8080/invite-to-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          group_id: parseInt(id),
          user_id: userId
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Invitation sent successfully');
        // Remove the invited user from the list
        setInvitableUsers(invitableUsers.filter(user => user.id !== userId));
      } else {
        alert(`Error: ${data.message || 'Failed to send invitation'}`);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error sending invitation');
    }
  };
  
  const joinGroup = async (groupId) => {
    try {
      const response = await fetch('http://localhost:8080/request-join-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          group_id: groupId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        const errorText = await response.text();
        alert(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Error sending join request');
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Social Network</title>
        </Head>
        <div className="container">
          <p>Loading group details...</p>
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <Head>
          <title>Group Not Found - Social Network</title>
        </Head>
        <div className="container">
          <h1>Group Not Found</h1>
          <p>The group you're looking for doesn't exist or you don't have permission to view it.</p>
          <a href="/groups" className="btn btn-primary">Back to Groups</a>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{group.title} - Social Network</title>
        <meta name="description" content={group.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/groups.css" />
        <link rel="stylesheet" href="/css/group-invite.css" />
      </Head>

      <div className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <a href="/posts">SocialNet</a>
          </div>
          <div className="nav-menu">
            <a href="/posts" className="nav-link">Posts</a>
            <a href="/groups" className="nav-link">Groups</a>
            <a href="/myProfile" className="nav-link">Profile</a>
            <a href="/createPost" className="nav-link">Create Post</a>
            <button id="logout-btn" className="nav-link logout-btn">Logout</button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="groups-header">
          <h1>{group.title}</h1>
          <a href="/groups" className="btn btn-secondary">Back to Groups</a>
        </div>

        <div className="group-card" style={{maxWidth: '800px', margin: '0 auto'}}>
          <div className="group-header">
            <h3>{group.title}</h3>
            <span className="member-count">{group.member_count} members</span>
          </div>
          <p className="group-description">{group.description}</p>
          <div className="group-meta">
            <span className="creator">Created by: {group.creator}</span>
            <span className="created-date">{new Date(group.created_at).toLocaleDateString()}</span>
          </div>
          
          {group.is_creator && (
            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
              <h4>Group Management</h4>
              <p>As the group creator, you can manage members and approve join requests.</p>
              <div style={{display: 'flex', gap: '10px'}}>
                <a href="/groups" className="btn btn-primary">Go to Pending Approvals</a>
                <button onClick={openInviteModal} className="btn btn-success">Invite Users</button>
              </div>
            </div>
          )}
          
          {group.user_membership_status === 'accepted' && !group.is_creator && (
            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px'}}>
              <p>✅ You are a member of this group</p>
              <button onClick={openInviteModal} className="btn btn-success" style={{marginTop: '10px'}}>Invite Friends</button>
            </div>
          )}
          
          {group.user_membership_status === 'pending' && (
            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px'}}>
              <p>⏳ Your join request is pending approval</p>
            </div>
          )}
          
          {group.user_membership_status === 'denied' && (
            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#ffdddd', borderRadius: '8px'}}>
              <p>❌ Your join request was declined</p>
              <button 
                onClick={() => joinGroup(group.id)} 
                className="btn btn-primary"
                style={{marginTop: '10px'}}
              >
                Request to Join Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Invite Users Modal */}
      {showInviteModal && (
        <div className="group-invite-modal" style={{display: 'block'}}>
          <div className="invite-modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{margin: 0}}>Invite Users to {group.title}</h3>
              <span 
                onClick={() => setShowInviteModal(false)} 
                style={{cursor: 'pointer', fontSize: '22px'}}
              >&times;</span>
            </div>
            
            <div className="invite-user-list">
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : invitableUsers.length === 0 ? (
                <p>No users available to invite.</p>
              ) : (
                <ul style={{listStyle: 'none', padding: 0}}>
                  {invitableUsers.map(user => (
                    <li key={user.id} className="invite-user-item">
                      <div className="invite-user-info">
                        <div className="invite-user-name">{user.username}</div>
                        <div className="invite-user-email">{user.email}</div>
                      </div>
                      <button 
                        onClick={() => inviteUser(user.id)} 
                        className="invite-btn"
                      >
                        Invite
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
