package database

import (
	"database/sql"
	"fmt"
)

// UpdateGroupMemberStatus updates the status of a group member
func UpdateGroupMemberStatus(db *sql.DB, groupID, userID int, status string) error {
	query := `UPDATE group_members SET status = ? WHERE group_id = ? AND user_id = ?`
	result, err := db.Exec(query, status, groupID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no membership record found or no changes made")
	}

	return nil
}
