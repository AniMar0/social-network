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
	"strconv"
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

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized - No session", http.StatusUnauthorized)
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

	if post.Privacy == "private" {
		for _, followerID := range post.SelectedFollowers {
			_, err = S.db.Exec(`
				INSERT INTO posts_private (post_id, user_id)
				VALUES (?, ?)`,
				post.ID, followerID,
			)
			if err != nil {
				fmt.Println("Error inserting follower:", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}
func (S *Server) LikeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	PostID := tools.StringToInt(r.URL.Path[len("/api/like/"):])

	// check if already liked
	var exists bool
	err = S.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM likes WHERE user_id=? AND post_id=?)",
		userID, PostID,
	).Scan(&exists)
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	userIDs, err := S.GetUserIdFromPostID(PostID)
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	if exists {
		// remove like
		_, err = S.db.Exec("DELETE FROM likes WHERE user_id=? AND post_id=?", userID, PostID)
		if err != nil {
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		_, _ = S.db.Exec("UPDATE posts SET likes = likes - 1 WHERE id=?", PostID)
		S.DeleteNotification(tools.IntToString(userID), tools.IntToString(userIDs), "like")

		S.PushNotification("-delete", userIDs, Notification{})
		json.NewEncoder(w).Encode(map[string]interface{}{"liked": false})
	} else {
		// add like
		_, err = S.db.Exec("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", userID, PostID)
		if err != nil {
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		_, _ = S.db.Exec("UPDATE posts SET likes = likes + 1 WHERE id=?", PostID)

		if userIDs != userID {
			notification := Notification{ID: userIDs, ActorID: userID, Type: "like", Content: "Like Your Post", IsRead: false}

			S.IsertNotification(notification)
			S.PushNotification("-new", userIDs, notification)
		}

		json.NewEncoder(w).Encode(map[string]interface{}{"liked": true})
	}
}

func (S *Server) GetUserPosts(userID int, r *http.Request) ([]Post, error) {
	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		return nil, err
	}

	rows, err := S.db.Query(`
	SELECT 
		p.id, p.content, p.image, p.created_at, p.privacy,
		u.id, u.first_name, u.last_name, u.nickname, u.avatar, u.is_private,
		(SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
		EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked
	FROM posts p
	JOIN users u ON p.user_id = u.id
	WHERE p.user_id = ?
	ORDER BY p.created_at DESC
`, currentUserID, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		var authorID int
		var firstName, lastName, nickname, avatar sql.NullString
		var isPrivate, isFollowing bool
		if err := rows.Scan(
			&post.ID, &post.Content, &post.Image, &post.CreatedAt, &post.Privacy,
			&authorID, &firstName, &lastName, &nickname, &avatar, &isPrivate,
			&post.Likes, &post.IsLiked,
		); err != nil {
			return nil, err
		}
		if post.Privacy == "almost-private" && authorID != currentUserID {
			isFollowing, err = S.IsFollowing(r, "", strconv.Itoa(authorID))
			if err != nil {
				return nil, err
			}
			if !isFollowing {
				continue
			}
		} else if post.Privacy == "private" {
			if authorID != currentUserID {
				continue
			}
		}
		// تحويل NullString إلى string
		post.Author = Author{
			Name:      firstName.String + " " + lastName.String,
			Username:  nickname.String,
			Avatar:    avatar.String,
			IsPrivate: isPrivate,
		}
		post.UserID = userID
		post.Comments = 0
		post.Shares = 0
		posts = append(posts, post)
	}

	return posts, nil
}

func (S *Server) GetUserIdFromPostID(postID int) (int, error) {
	var userID int
	err := S.db.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

func (S *Server) GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var allPosts []Post
	ids, err := S.GetAllUsers()
	if err != nil {
		fmt.Println("", err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	for _, userID := range ids {
		posts, err := S.GetUserPosts(userID, r)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "DB Error", http.StatusInternalServerError)
			return
		}
		allPosts = append(allPosts, posts...)

	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": allPosts,
		"user": map[string]interface{}{
			"userID": userID,
		},
	})
}

