package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/twinj/uuid"
)

func (S *Server) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	url := strings.TrimPrefix(r.URL.Path, "/api/profile/")

	fmt.Println("Profile URL:", url)

	if url == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	followers, err := S.GetFollowersCount(url)
	if err != nil {
		http.Error(w, "error getting followers", http.StatusInternalServerError)
		return
	}

	following, err := S.GetFollowingCount(url)
	if err != nil {
		http.Error(w, "error getting following", http.StatusInternalServerError)
		return
	}
	user, err := S.GetUserData(url, 0)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	userID, err := strconv.Atoi(user.ID)
	if err != nil {
		http.Error(w, "error converting user ID", http.StatusInternalServerError)
		return
	}
	posts, err := S.GetUserPosts(userID)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "error getting posts", http.StatusInternalServerError)
		return
	}

	var isFollowing bool
	isFollowing, err = S.IsFollowing(r, user.Url)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to check following status", http.StatusInternalServerError)
		return
	}

	resp := map[string]interface{}{
		"posts":       posts,
		"user":        user,
		"followers":   followers,
		"following":   following,
		"isfollowing": isFollowing,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("called AvatarHandeler")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "Cannot read avatar", http.StatusBadRequest)
		return
	}
	defer file.Close()
	avatarPath := "uploads/Avatars/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(avatarPath)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Cannot save avatar", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"avatarUrl": "/%s"}`, avatarPath)))
}
func (S *Server) UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var user UserData
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	id, _ := strconv.Atoi(user.ID)
	err := S.RemoveOldAvatar(id, *user.Avatar)
	if err != nil {
		http.Error(w, "Failed to remove old avatar", http.StatusInternalServerError)
		return
	}

	if user.Nickname != nil {
		user.Url = *user.Nickname
	}
	_, err = S.db.Exec(`
        UPDATE users
        SET first_name = ?, last_name = ?, nickname = ?, email = ?, birthdate = ?, avatar = ?, about_me = ?, is_private = ?, url = ?
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Nickname, user.Email, user.DateOfBirth, user.Avatar, user.AboutMe, user.IsPrivate, user.Url, user.ID,
	)
	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}
func (S *Server) UserFound(user User) (error, bool) {
	var exists int
	var query string
	var args []interface{}

	if user.Nickname != "" {
		// Check both email and nickname if nickname is provided
		query = "SELECT COUNT(*) FROM users WHERE email = ? OR nickname = ?"
		args = []interface{}{user.Email, user.Nickname}
	} else {
		// Only check email if nickname is empty (we allow multiple NULL nicknames)
		query = "SELECT COUNT(*) FROM users WHERE email = ?"
		args = []interface{}{user.Email}
	}

	err := S.db.QueryRow(query, args...).Scan(&exists)
	if err != nil {
		return err, false
	}
	if exists > 0 {
		return nil, true
	}
	return nil, false
}
func (S *Server) RemoveOldAvatar(userID int, newAvatar string) error {
	// Get the avatar filename from the database
	var oldAvatar string
	err := S.db.QueryRow(`SELECT avatar FROM users WHERE id = ?`, userID).Scan(&oldAvatar)
	if err != nil {
		return err
	}

	if oldAvatar == "/uploads/default.jpg" || oldAvatar == newAvatar {
		return nil
	}
	// Remove the avatar file from uploads folder if it exists and is not empty
	if oldAvatar != "" {
		avatarPath := fmt.Sprintf(".%s", oldAvatar)
		if err := os.Remove(avatarPath); err != nil && !os.IsNotExist(err) {
			return err
		}
	}

	return nil
}

// follow handlers
func (S *Server) CancelFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		FollowerID  string `json:"follower"`
		FollowingID string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	_, err := S.db.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		body.FollowerID, body.FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to cancel follow request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request cancelled"})
}
func (S *Server) AcceptFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		FollowerID  string `json:"follower"`
		FollowingID string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	tx, err := S.db.Begin()
	if err != nil {
		http.Error(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		body.FollowerID, body.FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to delete follow request", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`
		INSERT INTO follows (follower_id, following_id) 
		VALUES (?, ?)`,
		body.FollowerID, body.FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to accept follow request", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request accepted"})
}
func (S *Server) DeclineFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		FollowerID  string `json:"follower"`
		FollowingID string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	_, err := S.db.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		body.FollowerID, body.FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to decline follow request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request declined"})
}

func (S *Server) SendFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if already requested
	var exists int
	err := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
	`, req.Follower, req.Following).Scan(&exists)
	if err != nil {
		http.Error(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists > 0 {
		http.Error(w, "Follow request already sent", http.StatusConflict)
		return
	}

	// Insert new follow request (status = pending)
	_, err = S.db.Exec(`
		INSERT INTO follow_requests (sender_id, receiver_id, status) 
		VALUES (?, ?, 'pending')
	`, req.Follower, req.Following)
	if err != nil {
		http.Error(w, "Error inserting follow request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = S.db.Exec(`
    INSERT INTO notifications (user_id, actor_id, type, content)
    VALUES (?, ?, 'follow_request', 'sent you a follow request')
	`, req.Following, req.Follower)
	if err != nil {
		http.Error(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Follow request sent",
	})
}

func (S *Server) FollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if err := S.FollowUser(body.Follower, body.Following); err != nil {
		http.Error(w, "failed to follow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "followed successfully",
	})
}
func (S *Server) UnfollowHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Follower  string `json:"follower"`
		Following string `json:"following"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if err := S.UnfollowUser(body.Follower, body.Following); err != nil {
		http.Error(w, "failed to unfollow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "unfollowed successfully",
	})
}
func (S *Server) FollowUser(follower, following string) error {
	if follower == following {
		return fmt.Errorf("you cannot follow yourself")
	}
	query := `
		INSERT INTO follows (follower_id, following_id) VALUES (?, ?) 
		ON CONFLICT(follower_id, following_id) DO NOTHING`

	_, err := S.db.Exec(query, follower, following)

	return err
}
func (S *Server) UnfollowUser(follower, following string) error {
	_, err := S.db.Exec(`
		DELETE FROM follows WHERE follower_id = ? AND following_id = ?
	`, follower, following)

	return err
}
func (S *Server) GetFollowersCount(url string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follows f
		JOIN users u ON u.id = f.following_id
		WHERE u.url = ?
	`, url)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}
func (S *Server) GetFollowingCount(url string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) 
		FROM follows f
		JOIN users u ON u.id = f.follower_id
		WHERE u.url = ?
	`, url)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}
