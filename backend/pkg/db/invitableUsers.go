package database

import (
	"database/sql"
)

// GetInvitableUsers returns all users who are not already members of the group
func GetInvitableUsers(db *sql.DB, groupID int) ([]map[string]interface{}, error) {
	query := `
		SELECT id, username, email
		FROM users
		WHERE id NOT IN (
			SELECT user_id 
			FROM group_members 
			WHERE group_id = ? AND (status = 'accepted' OR status = 'pending')
		)
		AND id NOT IN (
			SELECT invitee_id 
			FROM group_invitations 
			WHERE group_id = ? AND status = 'pending'
		)
		ORDER BY username
	`

	rows, err := db.Query(query, groupID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id int
		var username, email string
		if err := rows.Scan(&id, &username, &email); err != nil {
			return nil, err
		}

		users = append(users, map[string]interface{}{
			"id":       id,
			"username": username,
			"email":    email,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
