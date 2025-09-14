package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/twinj/uuid"
)

func (S *Server) UploadPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("post")
	if err != nil {
		http.Error(w, "Cannot read post", http.StatusBadRequest)
		return
	}
	defer file.Close()
	postPath := "uploads/Posts/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(postPath)
	if err != nil {
		http.Error(w, "Cannot save post", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to save post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"postUrl": "/%s"}`, postPath)))
}
func (S *Server) CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized - No session", http.StatusUnauthorized)
		return
	}

	sessionID := cookie.Value
	var userID int
	err = S.db.QueryRow(`
        SELECT user_id FROM sessions 
        WHERE session_id = ? AND expires_at > datetime('now')`, sessionID).Scan(&userID)
	if err != nil {
		http.Error(w, "Unauthorized - Invalid session", http.StatusUnauthorized)
		return
	}

	var post Post
	err = json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(post.Content) == "" && post.Image == nil {
		http.Error(w, "Content cannot be empty", http.StatusBadRequest)
		return
	}

	// Insert into database
	res, err := S.db.Exec(`
        INSERT INTO posts (user_id, content, image, privacy)
        VALUES (?, ?, ?, ?)`,
		userID, html.EscapeString(post.Content), post.Image, post.Privacy,
	)
	if err != nil {
		fmt.Println("Error inserting post:", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	lastID, _ := res.LastInsertId()
	post.ID = int(lastID)
	post.UserID = userID
	post.CreatedAt = time.Now().Format(time.RFC3339)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}
func (S *Server) LikeHandler(w http.ResponseWriter, r *http.Request) {}

func (S *Server) GetUserPosts(userID int) ([]Post, error) {
	rows, err := S.db.Query(`
		SELECT 
			p.id, p.content, p.image, p.created_at, p.privacy, 
			u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = ?
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var authorID int
		var firstName, lastName, nickname, avatar sql.NullString
		var isPrivate bool
		if err := rows.Scan(
			&post.ID, &post.Content, &post.Image, &post.CreatedAt, &post.Privacy,
			&authorID, &firstName, &lastName, &nickname, &avatar, &isPrivate,
		); err != nil {
			return nil, err
		}

		// تحويل NullString إلى string
		post.Author = struct {
			Name      string `json:"name"`
			Username  string `json:"username"`
			Avatar    string `json:"avatar"`
			IsPrivate bool   `json:"isPrivate"`
		}{
			Name:      firstName.String + " " + lastName.String,
			Username:  nickname.String,
			Avatar:    avatar.String,
			IsPrivate: isPrivate,
		}

		post.UserID = userID
		post.Likes = 0
		post.Comments = 0
		post.Shares = 0
		post.IsLiked = false

		posts = append(posts, post)
	}

	return posts, nil
}
