// Groups functionality
function initializeGroupsPage() {
    // Check session on page load
    checkSession();
    
    // Load groups data
    loadAllGroups();
    loadUserGroups();
    loadGroupInvitations();
    loadPendingApprovals();

    // Tab functionality
    setupTabs();
    
    // Modal functionality
    setupModal();
    
    // Create group form
    setupCreateGroupForm();
    
    // Setup logout functionality
    setupLogout();
}

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGroupsPage);
} else {
    // DOM is already loaded
    initializeGroupsPage();
}

// Global variable to store current user info
let currentUser = null;

function checkSession() {
    fetch('http://localhost:8080/check-session', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.loggedIn) {
            window.location.href = '/login';
            return;
        }
        console.log('User logged in:', data.username);
        // Store current user info globally
        currentUser = {
            id: data.userID,
            username: data.username
        };
    })
    .catch(error => {
        console.error('Session check failed:', error);
        window.location.href = '/login';
    });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load appropriate data based on the selected tab
            switch(targetTab) {
                case 'all-groups':
                    loadAllGroups();
                    break;
                case 'my-groups':
                    loadUserGroups();
                    break;
                case 'invitations':
                    loadGroupInvitations();
                    break;
                case 'pending-approvals':
                    loadPendingApprovals();
                    break;
            }
        });
    });
}

function setupModal() {
    const modal = document.getElementById('create-group-modal');
    const createBtn = document.getElementById('create-group-btn');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-create');

    console.log('Modal elements:', { modal, createBtn, closeBtn, cancelBtn });

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            console.log('Create group button clicked');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function setupCreateGroupForm() {
    const form = document.getElementById('create-group-form');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const title = document.getElementById('group-title').value.trim();
        const description = document.getElementById('group-description').value.trim();
        
        if (!title || !description) {
            alert('Please fill in all fields');
            return;
        }
        
        const groupData = {
            title: title,
            description: description
        };
        
        fetch('http://localhost:8080/create-group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(groupData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Group created successfully!');
                document.getElementById('create-group-modal').style.display = 'none';
                form.reset();
                // Reload groups
                loadAllGroups();
                loadUserGroups();
            } else {
                alert('Error creating group: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error creating group:', error);
            alert('Error creating group');
        });
    });
}

function loadAllGroups() {
    fetch('http://localhost:8080/get-groups', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(groups => {
        displayGroups(groups, 'groups-list');
    })
    .catch(error => {
        console.error('Error loading groups:', error);
    });
}

function loadUserGroups() {
    fetch('http://localhost:8080/get-user-groups', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(groups => {
        displayGroups(groups, 'user-groups-list');
    })
    .catch(error => {
        console.error('Error loading user groups:', error);
    });
}

function loadGroupInvitations() {
    fetch('http://localhost:8080/get-group-invitations', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(invitations => {
        displayInvitations(invitations);
    })
    .catch(error => {
        console.error('Error loading invitations:', error);
    });
}

function displayGroups(groups, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!groups || groups.length === 0) {
        container.innerHTML = '<p>No groups found.</p>';
        return;
    }
    
    groups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-card';
        
        // Check if current user is the creator of this group
        const isCreator = currentUser && currentUser.id === group.creator_id;
        // Check if current user is already a member
        const isMember = group.user_membership_status === 'accepted';
        const isPending = group.user_membership_status === 'pending';
        
        // Different actions based on user status
        let actionsHTML;
        if (isCreator) {
            actionsHTML = `
                <button class="btn btn-success" disabled>Your Group</button>
                <button class="btn btn-secondary" onclick="viewGroup(${group.id})">Manage Group</button>
            `;
        } else if (isMember) {
            actionsHTML = `
                <button class="btn btn-success" disabled>Member</button>
                <button class="btn btn-secondary" onclick="viewGroup(${group.id})">View Group</button>
            `;
        } else if (isPending) {
            actionsHTML = `
                <button class="btn btn-warning" disabled>Pending</button>
                <button class="btn btn-secondary" onclick="viewGroup(${group.id})">View Details</button>
            `;
        } else {
            actionsHTML = `
                <button class="btn btn-primary" onclick="joinGroup(${group.id})">Join Group</button>
                <button class="btn btn-secondary" onclick="viewGroup(${group.id})">View Details</button>
            `;
        }
        
        groupElement.innerHTML = `
            <div class="group-header">
                <h3>${group.title}</h3>
                <span class="member-count">${group.member_count} members</span>
            </div>
            <p class="group-description">${group.description}</p>
            <div class="group-meta">
                <span class="creator">Created by: ${group.creator}</span>
                <span class="created-date">${new Date(group.created_at).toLocaleDateString()}</span>
            </div>
            <div class="group-actions">
                ${actionsHTML}
            </div>
        `;
        container.appendChild(groupElement);
    });
}

function displayInvitations(invitations) {
    const container = document.getElementById('invitations-list');
    container.innerHTML = '';
    
    if (!invitations || invitations.length === 0) {
        container.innerHTML = '<p>No pending invitations.</p>';
        return;
    }
    
    invitations.forEach(invitation => {
        const invitationElement = document.createElement('div');
        invitationElement.className = 'invitation-card';
        invitationElement.innerHTML = `
            <div class="invitation-content">
                <h4>${invitation.group_name}</h4>
                <p>Invited by: ${invitation.inviter}</p>
                <span class="invitation-date">${new Date(invitation.created_at).toLocaleDateString()}</span>
            </div>
            <div class="invitation-actions">
                <button class="btn btn-success" onclick="respondToInvitation(${invitation.id}, 'accepted')">Accept</button>
                <button class="btn btn-danger" onclick="respondToInvitation(${invitation.id}, 'declined')">Decline</button>
            </div>
        `;
        container.appendChild(invitationElement);
    });
}

function joinGroup(groupId) {
    const joinData = {
        group_id: groupId
    };
    
    fetch('http://localhost:8080/request-join-group', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(joinData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert(data.message);
            // Refresh all groups data to show updated member count and membership status
            loadAllGroups();
            loadUserGroups();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error joining group:', error);
        alert('Error: ' + error.message);
    });
}

function viewGroup(groupId) {
    // Navigate to group details page or show modal with group details
    window.location.href = `/groupDetails?id=${groupId}`;
}

function respondToInvitation(invitationId, status) {
    const responseData = {
        invitation_id: invitationId,
        status: status
    };
    
    fetch('http://localhost:8080/respond-group-invitation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(responseData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Invitation ${status} successfully!`);
            // Reload invitations and user groups
            loadGroupInvitations();
            loadUserGroups();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error responding to invitation:', error);
        alert('Error responding to invitation');
    });
}

// Load pending join requests for group admin
function loadPendingApprovals() {
    fetch('http://localhost:8080/get-pending-requests', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(requests => {
        displayPendingRequests(requests);
    })
    .catch(error => {
        console.error('Error loading pending requests:', error);
    });
}

// Display pending join requests
function displayPendingRequests(requests) {
    const container = document.getElementById('pending-approvals-list');
    if (!container) return;

    container.innerHTML = '';

    if (!requests || requests.length === 0) {
        container.innerHTML = '<p>No pending join requests.</p>';
        return;
    }

    requests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'invitation-card';
        requestElement.innerHTML = `
            <div class="invitation-content">
                <h4>${request.username} wants to join "${request.group_title}"</h4>
                <p class="invitation-date">Requested: ${new Date(request.requested_at).toLocaleDateString()}</p>
            </div>
            <div class="invitation-actions">
                <button class="btn btn-success" onclick="approveJoinRequest(${request.id}, 'accepted')">Accept</button>
                <button class="btn btn-danger" onclick="approveJoinRequest(${request.id}, 'denied')">Decline</button>
            </div>
        `;
        container.appendChild(requestElement);
    });
}

// Approve or deny join request
function approveJoinRequest(membershipId, status) {
    const approvalData = {
        membership_id: membershipId,
        status: status
    };

    fetch('http://localhost:8080/approve-join-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(approvalData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Join request ${status} successfully!`);
            // Reload pending requests and user groups
            loadPendingApprovals();
            loadUserGroups();
            loadAllGroups(); // Refresh to update member counts
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error processing join request:', error);
        alert('Error processing join request');
    });
}

// Logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('http://localhost:8080/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.message);
                window.location.href = '/'; // Redirect to main page instead of login
            })
            .catch(error => console.log(error));
        });
    }
}
