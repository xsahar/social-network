package user

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserProfile struct {
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Fname     string `json:"fname"`
	Lname     string `json:"lname"`
	Email     string `json:"email"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Password  string `json:"password"`
	Bio       string `json:"bio"`
	Avatar    string `json:"avatar"`
	IsPrivate bool   `json:"isPrivate"`
}

func IsFollowing(db *sql.DB, followerUsername, followingUsername string) bool {
	// First get the user IDs for the usernames
	var followerID, followingID int

	// Get follower ID
	err := db.QueryRow(`SELECT id FROM users WHERE username = ?`, followerUsername).Scan(&followerID)
	if err != nil {
		fmt.Println("Error getting follower ID:", err)
		return false
	}

	// Get following ID
	err = db.QueryRow(`SELECT id FROM users WHERE username = ?`, followingUsername).Scan(&followingID)
	if err != nil {
		fmt.Println("Error getting following ID:", err)
		return false
	}

	// Check if the follow relationship exists in userFollow table
	var count int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM userFollow 
		WHERE follower_id = ? AND following_id = ?`,
		followerID, followingID).Scan(&count)

	if err != nil {
		fmt.Println("Error checking follow status:", err)
		return false
	}

	return count > 0
}

// Add this simple response struct
type ProfilePrivacyResponse struct {
	Profile      UserProfile `json:"profile"`
	Posts        interface{} `json:"posts"`
	IsFollowing  bool        `json:"isFollowing"`
	CanViewPosts bool        `json:"canViewPosts"`
}

func GetProfileHandler(db *sql.DB, w http.ResponseWriter, r *http.Request, username string) {
	var bio sql.NullString
	var profile UserProfile

	err := db.QueryRow(`
    SELECT username, nickname, firstname, lastname, email, age, gender, bio , avatar_url, isPrivate
    FROM users WHERE username = ?`,
		username).Scan(
		&profile.Username,
		&profile.Nickname,
		&profile.Fname,
		&profile.Lname,
		&profile.Email,
		&profile.Age,
		&profile.Gender,
		&bio,
		&profile.Avatar,
		&profile.IsPrivate,
	)
	if bio.Valid {
		profile.Bio = bio.String
	} else {
		profile.Bio = "" // Default value when NULL
	}
	if err != nil {
		fmt.Println("Error fetching user:", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	profileObj := map[string]interface{}{
		"username":  profile.Username,
		"fname":     profile.Fname,
		"lname":     profile.Lname,
		"email":     profile.Email,
		"age":       profile.Age,
		"gender":    profile.Gender,
		"bio":       profile.Bio,
		"avatar":    profile.Avatar,
		"isPrivate": profile.IsPrivate,
		"nickname":  profile.Nickname,
	}
	fmt.Println("Fetched profile:", profileObj)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"profile": profileObj,
	})
}

func UpdateProfileHandler(db *sql.DB, w http.ResponseWriter, r *http.Request, currentUsername string) {
	// 1) parse multipart form (limit memory + total size)
	const maxMem = 10 << 20 // 10MB
	if err := r.ParseMultipartForm(maxMem); err != nil {
		http.Error(w, "could not parse form", http.StatusBadRequest)
		return
	}

	// 2) load existing user (include id + password hash)
	var existing UserProfile
	var existingBio sql.NullString
	err := db.QueryRow(`
        SELECT username, nickname, firstname, lastname, email, age, gender, password, bio, avatar_url, isPrivate
        FROM users WHERE username = ?`, currentUsername).
		Scan(
			&existing.Username,
			&existing.Nickname,
			&existing.Fname,
			&existing.Lname,
			&existing.Email,
			&existing.Age,
			&existing.Gender,
			&existing.Password, // this is the bcrypt hash
			&existingBio,
			&existing.Avatar,
			&existing.IsPrivate,
		)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if existingBio.Valid {
		existing.Bio = existingBio.String
	}

	// 3) avatar handling (reset, upload, or keep)
	avatarURL := existing.Avatar
	if r.FormValue("resetAvatar") == "true" {
		avatarURL = "/img/avatars/images.png"
	} else {
		file, header, err := r.FormFile("avatarInput")
		if err != nil && err != http.ErrMissingFile {
			http.Error(w, "error reading avatar", http.StatusBadRequest)
			return
		}
		if err == nil && header != nil && header.Filename != "" {
			defer file.Close()

			// Read a small header to detect MIME
			head := make([]byte, 512)
			n, _ := io.ReadFull(file, head)
			mime := http.DetectContentType(head[:n])
			// Reset reader to start
			if _, err := file.Seek(0, io.SeekStart); err != nil {
				http.Error(w, "could not read avatar", http.StatusInternalServerError)
				return
			}
			if mime != "image/png" && mime != "image/jpeg" {
				http.Error(w, "Image must be PNG or JPG.", http.StatusBadRequest)
				return
			}

			// Save into Next.js public dir (consider making this configurable)
			uploadDir := filepath.Join("..", "frontend-next", "public", "img", "avatars")
			if err := os.MkdirAll(uploadDir, 0o755); err != nil {
				log.Println("avatar save: MkdirAll error:", err)
				http.Error(w, "could not save avatar", http.StatusInternalServerError)
				return
			}

			base := filepath.Base(strings.ReplaceAll(header.Filename, " ", "-"))
			ext := strings.ToLower(filepath.Ext(base))
			if ext == "" {
				// derive from MIME if missing
				if mime == "image/png" {
					ext = ".png"
				} else if mime == "image/jpeg" {
					ext = ".jpg"
				}
			}
			stamp := time.Now().UTC().Format("20060102T150405")
			nameNoExt := strings.TrimSuffix(base, ext)
			finalName := fmt.Sprintf("%s_%s%s", nameNoExt, stamp, ext)

			dstPath := filepath.Join(uploadDir, finalName)
			dst, err := os.Create(dstPath)
			if err != nil {
				log.Println("avatar save: Create error:", err)
				http.Error(w, "could not save avatar", http.StatusInternalServerError)
				return
			}
			defer dst.Close()

			if _, err := io.Copy(dst, file); err != nil {
				log.Println("avatar save: Copy error:", err)
				http.Error(w, "could not save avatar", http.StatusInternalServerError)
				return
			}
			avatarURL = "/img/avatars/" + finalName
		}
	}

	// helpers
	get := func(key, old string) string {
		v := strings.TrimSpace(r.FormValue(key))
		if v == "" {
			return old
		}
		return v
	}
	parseBool := func(val string, fallback bool) bool {
		if val == "" {
			return fallback
		}
		switch strings.ToLower(strings.TrimSpace(val)) {
		case "1", "true", "on", "yes":
			return true
		case "0", "false", "off", "no":
			return false
		default:
			return fallback
		}
	}
	parseInt := func(val string, fallback int) int {
		if strings.TrimSpace(val) == "" {
			return fallback
		}
		if n, err := strconv.Atoi(val); err == nil && n > 0 {
			return n
		}
		return fallback
	}

	// 4) read text fields with fallbacks
	age := parseInt(r.FormValue("age"), existing.Age)
	isPrivate := parseBool(r.FormValue("isPrivate"), existing.IsPrivate)

	username := get("username", existing.Username)
	nickname := get("nickname", existing.Nickname) // <- fixed fallback
	fname := get("fname", existing.Fname)
	lname := get("lname", existing.Lname)
	email := get("email", existing.Email)
	gender := get("gender", existing.Gender)

	bio := ""
	if b := strings.TrimSpace(r.FormValue("bio")); b != "" {
		bio = b
	}

	oldPassword := r.FormValue("password")
	newPassword := r.FormValue("newPassword")
	passwordHash := existing.Password // default: unchanged

	fmt.Println("New password: ", newPassword)
	// 4a) if newPassword provided, verify oldPassword and re-hash
	if strings.TrimSpace(newPassword) != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(existing.Password), []byte(oldPassword)); err != nil {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Wrong password",
			})
			return
		}
		newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Println("New password hashing error:", err)
			http.Error(w, "Failed to hash new password", http.StatusInternalServerError)
			return
		}
		passwordHash = string(newHash)
	} else {
		// If newPassword is empty, keep the old password hash
		passwordHash = existing.Password
	}

	// (Optional) enforce username/email uniqueness if changed
	if username != existing.Username {
		var count int
		if err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE username = ? `, username).Scan(&count); err == nil && count > 0 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Username already taken",
			})
			return
		}
	}
	if email != existing.Email {
		var count int
		if err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ? `, email).Scan(&count); err == nil && count > 0 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Email already in use",
			})
			return
		}
	}

	fmt.Println("Updating profile:", map[string]interface{}{
		"username":  username,
		"nickname":  nickname,
		"fname":     fname,
		"lname":     lname,
		"email":     email,
		"age":       age,
		"password":  oldPassword,
		"newPass":   newPassword,
		"gender":    gender,
		"bio":       bio,
		"avatar":    avatarURL,
		"isPrivate": isPrivate,
	})

	// 5) UPDATE by id (stable key)
	_, err = db.Exec(`
        UPDATE users SET username = ?, nickname = ? ,firstname = ?, lastname = ?, email = ?, password = ?, age = ?, gender = ?, bio = ?, avatar_url = ?, isPrivate = ? WHERE username = ?`,
		username, nickname, fname, lname, email, passwordHash, age, gender, bio, avatarURL, isPrivate, currentUsername,
	)
	if err != nil {
		log.Println("update profile error:", err)
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	// 6) respond (never include password/hash)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Profile updated",
	})
}

func GetOtherProfile(db *sql.DB, username string) (UserProfile, error) {
	var bio sql.NullString
	var profile UserProfile

	err := db.QueryRow(`
		SELECT username, nickname, firstname, lastname, email, age, gender, password, bio, avatar_url, isPrivate
		FROM users WHERE username = ?`,
		username).Scan(
		&profile.Username,
		&profile.Nickname,
		&profile.Fname,
		&profile.Lname,
		&profile.Email,
		&profile.Age,
		&profile.Gender,
		&profile.Password,
		&bio,
		&profile.Avatar,
		&profile.IsPrivate,
	)

	if err != nil {
		return UserProfile{}, err
	}

	profile.Bio = ""
	if bio.Valid {
		profile.Bio = bio.String
	}

	return profile, nil
}
