package group

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	u "socialnetwork/pkg/apis/user"
	database "socialnetwork/pkg/db"
)

// GetPendingJoinRequests returns all pending group join requests for groups where the user is an admin
func GetPendingJoinRequests(db *sql.DB, w http.ResponseWriter, r *http.Request) {
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

	// Get pending join requests
	requests, err := database.GetPendingGroupJoinRequests(db, userID)
	if err != nil {
		fmt.Println("Error retrieving pending join requests:", err)
		http.Error(w, "Failed to retrieve pending join requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// RespondToJoinRequest handles approving/rejecting group join requests
type RespondJoinRequestBody struct {
	RequestID int    `json:"request_id"`
	Status    string `json:"status"` // "accepted" or "declined"
}

func RespondToJoinRequest(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate session and get user ID
	adminUserID, loggedIn := u.ValidateSession(db, r)
	if !loggedIn {
		http.Error(w, "Unauthorized. Please log in.", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var requestData RespondJoinRequestBody
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&requestData); err != nil {
		fmt.Println("JSON Decoding Error:", err)
		http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
		return
	}

	if requestData.Status != "accepted" && requestData.Status != "declined" {
		http.Error(w, "Invalid status. Must be 'accepted' or 'declined'", http.StatusBadRequest)
		return
	}

	// Update the status
	err := database.UpdateGroupMemberStatus(db, requestData.RequestID, adminUserID, requestData.Status)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not authorized or request not found", http.StatusForbidden)
		} else {
			fmt.Println("Error updating join request status:", err)
			http.Error(w, "Failed to update join request", http.StatusInternalServerError)
		}
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Join request %s successfully", requestData.Status),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
