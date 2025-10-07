package post

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	u "socialnetwork/pkg/apis/user"
	database "socialnetwork/pkg/db"
	"strconv"
	"strings"
)

// Post structure with privacy
type Post struct {
	Title             string   `json:"title"`
	Content           string   `json:"content"`
	ImgOrGif          string   `json:"imgOrgif"`
	Categories        []string `json:"categories"`
	PrivacyLevel      int      `json:"privacy_level"` // 0=public, 1=followers, 2=selected
	SelectedFollowers []int    `json:"selected_followers"`
}

// CreatePost handles post submission with privacy
func CreatePost(db *sql.DB, w http.ResponseWriter, r *http.Request) {
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

	// 2) parse multipart form (up to 10 MB in memory)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Could not parse form", http.StatusBadRequest)
		return
	}

	// 3) pull out text fields
	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	if title == "" || content == "" {
		http.Error(w, "Title and Content cannot be empty.", http.StatusBadRequest)
		return
	}

	privacyLevel, _ := strconv.Atoi(r.FormValue("privacy_level"))
	// Validate privacy level
	if privacyLevel < 0 || privacyLevel > 2 {
		privacyLevel = 0 // Default to public
	}

	// 4) handle optional image upload
	imgOrGif := ""
	file, header, err := r.FormFile("imgOrgif")
	if err == nil {
		defer file.Close()

		// sanitize extension
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != ".gif" && ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			http.Error(w, "Image must be a GIF, PNG, or JPG.", http.StatusBadRequest)
			return
		}

		// generate a safe filename
		fname := strings.ReplaceAll(header.Filename, " ", "-")
		dstFile, err := os.Create("../frontend-next/public/img/posts/" + fname)
		if err != nil {
			log.Println("file create error:", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}
		defer dstFile.Close()

		if _, err := io.Copy(dstFile, file); err != nil {
			log.Println("file copy error:", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		// this is the URL your frontend can use to display the image
		imgOrGif = "/img/posts/" + fname
	} else if err != http.ErrMissingFile {
		http.Error(w, "Error reading uploaded file", http.StatusBadRequest)
		return
	}

	// 5) parse categories (checkboxes with name="category")
	cats := r.MultipartForm.Value["category"]
	if len(cats) == 0 {
		cats = []string{"none"}
	}

	// 6) insert the post record
	// Insert the post into the database with privacy
	postID, createdAt, err := database.InsertPostWithPrivacy(db, userID, title, content, imgOrGif, privacyLevel)
	if err != nil {
		fmt.Println("Error inserting post:", err)
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	// 7) link categories
	for _, catName := range cats {
		catID, err := database.GetCategoryID(db, catName)
		if err != nil {
			log.Println("GetCategoryID error:", err)
			http.Error(w, "Failed to retrieve category", http.StatusInternalServerError)
			return
		}
		if err := database.InsertPostCategory(db, int(postID), catID); err != nil {
			log.Println("InsertPostCategory error:", err)
			http.Error(w, "Failed to link category", http.StatusInternalServerError)
			return
		}
	}

	selectedFollowersStr := r.MultipartForm.Value["selected_followers"]
	var selectedFollowersInt []int

	for _, strID := range selectedFollowersStr {
		id, err := strconv.Atoi(strID)
		if err != nil {
			// handle the error appropriately, maybe skip or log
			continue
		}
		selectedFollowersInt = append(selectedFollowersInt, id)
	}
	// Handle private post permissions (privacy level 2)
	if privacyLevel == 2 && len(selectedFollowersInt) > 0 {
		err = database.AddPostPermissions(db, int(postID), selectedFollowersInt)
		if err != nil {
			fmt.Println("Error adding post permissions:", err)
			http.Error(w, "Failed to set post permissions", http.StatusInternalServerError)
			return
		}
	}

	// Send success response
	response := map[string]interface{}{
		"success":       true,
		"message":       "Post created successfully.",
		"postID":        postID,
		"createdAt":     createdAt,
		"privacy_level": privacyLevel,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetUserFollowers returns followers for post privacy selection
func GetUserFollowers(db *sql.DB, w http.ResponseWriter, r *http.Request) {
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

	// Get followers
	followers, err := database.GetUserFollowers(db, userID)
	if err != nil {
		fmt.Println("Error getting followers:", err)
		http.Error(w, "Failed to get followers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"followers": followers,
	})
}
