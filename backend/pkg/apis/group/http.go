package group

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	u "socialnetwork/pkg/apis/user"
	database "socialnetwork/pkg/db"
)

// CreateGroup handles group creation
func CreateGroup(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var groupData CreateGroupRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&groupData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	// Validate group fields
	if groupData.Title == "" || groupData.Description == "" {
		http.Error(w, "Title and Description cannot be empty.", http.StatusBadRequest)
		return
	}

	// Insert the group into the database
	groupID, createdAt, err := database.InsertGroup(db, userID, groupData.Title, groupData.Description)
	if err != nil {
		fmt.Println("Error inserting group:", err)
		http.Error(w, "Failed to create group", http.StatusInternalServerError)
		return
	}

	// Automatically add creator as admin member
	err = database.InsertGroupMember(db, int(groupID), userID, "accepted", true)
	if err != nil {
		fmt.Println("Error adding creator as group admin:", err)
		http.Error(w, "Failed to add creator to group", http.StatusInternalServerError)
		return
	}

	// Send success response
	response := map[string]interface{}{
		"success":   true,
		"message":   "Group created successfully.",
		"groupID":   groupID,
		"createdAt": createdAt,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetGroups returns all groups
func GetGroups(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	groups, err := database.GetAllGroupsWithMembership(db, userID)
	if err != nil {
		fmt.Println("Error retrieving groups:", err)
		http.Error(w, "Failed to retrieve groups", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

// GetGroupDetails returns detailed information about a specific group
func GetGroupDetails(db *sql.DB, w http.ResponseWriter, r *http.Request, groupIDStr string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	groupID, err := database.ParseID(groupIDStr)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	group, err := database.GetGroupByID(db, groupID)
	if err != nil {
		fmt.Println("Error retrieving group:", err)
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Check if user is a member
	isMember, err := database.IsGroupMember(db, groupID, userID)
	if err != nil {
		fmt.Println("Error checking group membership:", err)
		http.Error(w, "Error checking membership", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"group":    group,
		"isMember": isMember,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// InviteUserToGroup handles group invitations
func InviteUserToGroup(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	inviterID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var inviteData InviteUserRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&inviteData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	// Check if inviter is a member of the group
	isMember, err := database.IsGroupMember(db, inviteData.GroupID, inviterID)
	if err != nil || !isMember {
		http.Error(w, "You must be a member to invite users", http.StatusForbidden)
		return
	}

	// Check if user is already a member or has pending invitation
	existingStatus, err := database.GetGroupMemberStatus(db, inviteData.GroupID, inviteData.UserID)
	if err == nil && existingStatus != "" {
		http.Error(w, "User is already a member or has a pending invitation", http.StatusConflict)
		return
	}

	// Insert invitation
	err = database.InsertGroupInvitation(db, inviteData.GroupID, inviterID, inviteData.UserID)
	if err != nil {
		fmt.Println("Error creating invitation:", err)
		http.Error(w, "Failed to send invitation", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Invitation sent successfully.",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RespondToGroupInvitation handles accepting/declining group invitations
func RespondToGroupInvitation(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var responseData ResponseInvitationRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&responseData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	if responseData.Status != "accepted" && responseData.Status != "declined" {
		http.Error(w, "Invalid status. Must be 'accepted' or 'declined'", http.StatusBadRequest)
		return
	}

	// Update invitation status
	err := database.UpdateGroupInvitationStatus(db, responseData.InvitationID, userID, responseData.Status)
	if err != nil {
		fmt.Println("Error updating invitation:", err)
		http.Error(w, "Failed to respond to invitation", http.StatusInternalServerError)
		return
	}

	// If accepted, add user to group members
	if responseData.Status == "accepted" {
		groupID, err := database.GetGroupIDFromInvitation(db, responseData.InvitationID)
		if err != nil {
			fmt.Println("Error getting group ID:", err)
			http.Error(w, "Failed to process invitation", http.StatusInternalServerError)
			return
		}

		err = database.InsertGroupMember(db, groupID, userID, "accepted", false)
		if err != nil {
			fmt.Println("Error adding user to group:", err)
			http.Error(w, "Failed to join group", http.StatusInternalServerError)
			return
		}
	}

	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Invitation %s successfully.", responseData.Status),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RequestToJoinGroup handles join requests
func RequestToJoinGroup(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var joinData JoinGroupRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&joinData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	// Check if user is already a member or has pending request
	existingStatus, err := database.GetGroupMemberStatus(db, joinData.GroupID, userID)
	if err == nil && existingStatus != "" {
		if existingStatus == "accepted" {
			http.Error(w, "You are already a member of this group", http.StatusConflict)
		} else {
			http.Error(w, "You already have a pending request for this group", http.StatusConflict)
		}
		return
	}

	// Add user as pending member (requires approval)
	err = database.InsertGroupMember(db, joinData.GroupID, userID, "pending", false)
	if err != nil {
		fmt.Println("Error creating join request:", err)
		http.Error(w, "Failed to send join request", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Join request sent successfully. Waiting for group admin approval.",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetUserGroups returns groups where user is a member
func GetUserGroups(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	groups, err := database.GetUserGroups(db, userID)
	if err != nil {
		fmt.Println("Error retrieving user groups:", err)
		http.Error(w, "Failed to retrieve groups", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

// GetGroupInvitations returns pending invitations for the user
func GetGroupInvitations(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	invitations, err := database.GetUserGroupInvitations(db, userID)
	if err != nil {
		fmt.Println("Error retrieving invitations:", err)
		http.Error(w, "Failed to retrieve invitations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invitations)
}

// GetPendingRequests returns pending join requests for groups owned by the user
func GetPendingRequests(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Get pending join requests for groups owned by this user
	requests, err := database.GetPendingJoinRequests(db, userID)
	if err != nil {
		fmt.Println("Error retrieving pending requests:", err)
		http.Error(w, "Failed to retrieve pending requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// ApproveJoinRequest handles approval/denial of join requests
func ApproveJoinRequest(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	userID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var approvalData struct {
		MembershipID int    `json:"membership_id"`
		Status       string `json:"status"` // "accepted" or "denied"
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&approvalData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	// Validate status
	if approvalData.Status != "accepted" && approvalData.Status != "denied" {
		http.Error(w, "Status must be 'accepted' or 'denied'", http.StatusBadRequest)
		return
	}

	// Approve or deny the request
	err := database.ApproveJoinRequest(db, approvalData.MembershipID, userID, approvalData.Status)
	if err != nil {
		fmt.Println("Error processing join request approval:", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Join request %s successfully.", approvalData.Status),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
