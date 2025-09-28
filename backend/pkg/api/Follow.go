package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

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
	//dellete notification from database
	S.DeleteNotification(body.FollowerID, body.FollowingID, "follow_request")

	S.PushNotification("-delete", tools.StringToInt(body.FollowingID), Notification{})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request cancelled"})
}
func (S *Server) AcceptFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var FollowerID, FollowingID string
	id := r.URL.Path[len("/api/accept-follow-request/"):]

	FollowerID, FollowingID, err := S.GetSenderAndReceiverIDs(id)
	if err != nil {
		fmt.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
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
		FollowerID, FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to delete follow request", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`
		INSERT INTO follows (follower_id, following_id) 
		VALUES (?, ?)`,
		FollowerID, FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to accept follow request", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	notification := Notification{
		ID:        tools.StringToInt(FollowerID),
		ActorID:   tools.StringToInt(FollowingID),
		Type:      "follow",
		Content:   "Follow Request Accepted",
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	if err := S.IsertNotification(notification); err != nil {
		fmt.Println(err)
		http.Error(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	S.PushNotification("-new", tools.StringToInt(FollowerID), notification)
	S.PushNotification("-read", tools.StringToInt(FollowingID), notification)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "follow request accepted"})
}
func (S *Server) DeclineFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var FollowerID, FollowingID string
	id := r.URL.Path[len("/api/decline-follow-request/"):]

	FollowerID, FollowingID, err := S.GetSenderAndReceiverIDs(id)
	if err != nil {
		fmt.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err = S.db.Exec(`
		DELETE FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?`,
		FollowerID, FollowingID,
	)
	if err != nil {
		http.Error(w, "failed to decline follow request", http.StatusInternalServerError)
		return
	}
	S.DeleteNotification(FollowerID, FollowingID, "follow_request")

	S.PushNotification("-read", tools.StringToInt(FollowingID), Notification{})
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

	// check duplicate
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

	_, err = S.db.Exec(`
		INSERT INTO follow_requests (sender_id, receiver_id, status) 
		VALUES (?, ?, 'pending')
	`, req.Follower, req.Following)
	if err != nil {
		http.Error(w, "Error inserting follow request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	notification := Notification{
		ID:        tools.StringToInt(req.Following),
		ActorID:   tools.StringToInt(req.Follower),
		Type:      "follow_request",
		Content:   "Follow request",
		IsRead:    false,
		CreatedAt: time.Now(),
	}
	if err := S.IsertNotification(notification); err != nil {
		http.Error(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	S.PushNotification("-new", tools.StringToInt(req.Following), notification)

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

	notification := Notification{
		ID:        tools.StringToInt(body.Following),
		ActorID:   tools.StringToInt(body.Follower),
		Type:      "follow",
		Content:   "Follow",
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	if err := S.IsertNotification(notification); err != nil {
		fmt.Println(err)
		http.Error(w, "Error inserting notification: "+err.Error(), http.StatusInternalServerError)
		return
	}

	S.PushNotification("-new", tools.StringToInt(body.Following), notification)

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

	S.DeleteNotification(body.Follower, body.Following, "follow")

	S.PushNotification("-delete", tools.StringToInt(body.Following), Notification{})

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
func (S *Server) GetFollowRequestStatus(r *http.Request, followingURL string) (string, error) {
	follower, _, _ := S.CheckSession(r)
	var followingID int
	err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
	if err != nil {
		return "", err
	}

	var status string
	if err := S.db.QueryRow(`
		SELECT status 
		FROM follow_requests 
		WHERE sender_id = ? AND receiver_id = ?
	`, follower, followingID).Scan(&status); err != nil {
		return "", err
	}
	return status, nil
}
func (S *Server) IsFollowing(r *http.Request, followingURL, followingID string) (bool, error) {
	followerID, _, _ := S.CheckSession(r)
	if followingID == "" {
		err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
		if err != nil {
			return false, err
		}
	}
	var isFollowing bool
	err := S.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?)`, followerID, followingID).Scan(&isFollowing)
	if err != nil {
		return false, err
	}

	return isFollowing, nil
}

func (S *Server) IsFollower(r *http.Request, followingURL, followingID string) (bool, error) {
	followerID, _, _ := S.CheckSession(r)
	if followingID == "" {
		err := S.db.QueryRow(`SELECT id FROM users WHERE url = ?`, followingURL).Scan(&followingID)
		if err != nil {
			return false, err
		}
	}
	var isFollowing bool
	err := S.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?)`, followingID, followerID).Scan(&isFollowing)
	if err != nil {
		return false, err
	}

	return isFollowing, nil
}

func (S *Server) GetFollowersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUser, _, _ := S.CheckSession(r)
	followers, err := S.GetFollowers(currentUser)
	if err != nil {
		http.Error(w, "failed to get followers", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(followers)

}

func (S *Server) GetFollowers(User int) ([]Follower, error) {
	var followers []Follower
	query := `SELECT 
    	u.id,
    	u.first_name,
    	u.last_name,
    	u.nickname,
    	u.avatar
	FROM follows f
	JOIN users u ON u.id = f.follower_id
	WHERE f.following_id = ?;
	`

	rows, err := S.db.Query(query, User)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var follower Follower
		if err := rows.Scan(&follower.ID, &follower.FirstName, &follower.LastName, &follower.Nickname, &follower.Avatar); err != nil {
			return nil, err
		}
		followers = append(followers, follower)
	}
	return followers, nil
}
