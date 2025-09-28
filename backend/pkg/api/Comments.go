package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func (S *Server) CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Content         string `json:"content"`
		ParentCommentId *int   `json:"parentCommentId,omitempty"`
		PostID          int    `json:"postID"`
	}

	err = json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	commentID, err := S.CreateComment(currentUserID, body.Content, body.PostID, body.ParentCommentId)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	comment, err := S.GetCommentByID(commentID, r)
	if err != nil {
		http.Error(w, "Failed to get comment", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comment)
}

func (S *Server) GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	postID := strings.TrimPrefix(r.URL.Path, "/api/get-comments/")

	comments, err := S.GetComments(tools.StringToInt(postID), r)
	if err != nil {
		http.Error(w, "Failed to get comments", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}

func (S *Server) LikeCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	currentUserID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	commentID := strings.TrimPrefix(r.URL.Path, "/api/like-comment/")

	liked, err := S.LikeComment(tools.StringToInt(commentID), currentUserID)
	if err != nil {
		fmt.Println("liked comment error db : ", err)
		http.Error(w, "Failed to like comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"liked": liked})
}

func (S *Server) CreateComment(userID int, content string, postID int, parentCommentID *int) (int, error) {
	sqlRes, err := S.db.Exec("INSERT INTO comments (user_id, content, post_id, parent_comment_id) VALUES (?, ?, ?, ?)", userID, content, postID, parentCommentID)
	if err != nil {
		return 0, err
	}
	lastID, _ := sqlRes.LastInsertId()
	return int(lastID), nil
}

func (S *Server) GetComments(postID int, r *http.Request) ([]Comment, error) {
	currentUserID, _, _ := S.CheckSession(r)

	rows, err := S.db.Query(`
		SELECT 
			c.id, c.content, c.created_at, c.parent_comment_id,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar,
			(SELECT COUNT(*) FROM likes l WHERE l.comment_id = c.id) as like_count,
			EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ?) as is_liked
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, currentUserID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	commentsMap := make(map[int]*Comment)
	var allComments []*Comment

	for rows.Next() {
		var comment Comment
		var parentCommentID sql.NullInt64
		var authorName, authorUsername, authorAvatar sql.NullString

		if err := rows.Scan(
			&comment.ID,
			&comment.Content,
			&comment.CreatedAt,
			&parentCommentID,
			&authorName,
			&authorUsername,
			&authorAvatar,
			&comment.Likes,
			&comment.IsLiked,
		); err != nil {
			return nil, err
		}

		// handle nullable parent_id
		if parentCommentID.Valid {
			id := int(parentCommentID.Int64)
			comment.ParentCommentID = &id
		}

		// author
		comment.Author.Name = authorName.String
		comment.Author.Username = authorUsername.String
		comment.Author.Avatar = authorAvatar.String

		comment.Replies = []Comment{}

		commentsMap[tools.StringToInt(comment.ID)] = &comment
		allComments = append(allComments, &comment)
	}

	var rootComments []Comment
	for _, c := range allComments {
		if c.ParentCommentID != nil {
			parent := commentsMap[*c.ParentCommentID]
			if parent != nil {
				parent.Replies = append(parent.Replies, *c)
			}
		} else {
			rootComments = append(rootComments, *c)
		}
	}

	return rootComments, nil
}

func (S *Server) GetCommentByID(commentID int, r *http.Request) (Comment, error) {
	currentUserID, _, _ := S.CheckSession(r)

	row := S.db.QueryRow(`
		SELECT 
			c.id, c.content, c.created_at, c.parent_comment_id,
			u.first_name || ' ' || u.last_name AS name, 
			u.nickname, u.avatar,
			(SELECT COUNT(*) FROM likes l WHERE l.comment_id = c.id) as like_count,
			EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.user_id = ?) as is_liked
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = ?
	`, currentUserID, commentID)

	var comment Comment
	var parentCommentID sql.NullInt64
	var authorName, authorUsername, authorAvatar sql.NullString

	err := row.Scan(
		&comment.ID,
		&comment.Content,
		&comment.CreatedAt,
		&parentCommentID,
		&authorName,
		&authorUsername,
		&authorAvatar,
		&comment.Likes,
		&comment.IsLiked,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return Comment{}, nil // comment not found
		}
		fmt.Println("get one comment error : ", err)
		return Comment{}, err
	}

	// handle nullable parent_id
	if parentCommentID.Valid {
		id := int(parentCommentID.Int64)
		comment.ParentCommentID = &id
	}

	// author
	comment.Author.Name = authorName.String
	comment.Author.Username = authorUsername.String
	comment.Author.Avatar = authorAvatar.String

	comment.Replies = []Comment{}

	return comment, nil
}

func (S *Server) LikeComment(commentID int, userID int) (bool, error) {
	var exists bool
	err := S.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM likes WHERE user_id=? AND comment_id=?)",
		userID, commentID,
	).Scan(&exists)
	if err != nil {
		return false, err
	}

	AuthorID, err := S.GetCommentAuthorID(commentID)
	if err != nil {
		return false, err
	}

	if exists {
		_, err = S.db.Exec("DELETE FROM likes WHERE user_id=? AND comment_id=?", userID, commentID)
		if err != nil {
			return false, err
		}
		_, err = S.db.Exec("UPDATE comments SET likes = likes - 1 WHERE id=?", commentID)
		if err != nil {
			return false, err
		}
		S.DeleteNotification(tools.IntToString(userID), tools.IntToString(AuthorID), "like")
		S.PushNotification("-delete", AuthorID, Notification{})
		return false, nil
	} else {
		_, err = S.db.Exec("INSERT INTO likes (comment_id, user_id) VALUES (?, ?)", commentID, userID)
		if err != nil {
			return false, err
		}
		_, err = S.db.Exec("UPDATE comments SET likes = likes + 1 WHERE id=?", commentID)
		if err != nil {
			return false, err
		}
		if AuthorID != userID {
			notification := Notification{ID: AuthorID, ActorID: userID, Type: "like", Content: "Like Your Comment", IsRead: false}

			S.IsertNotification(notification)
			S.PushNotification("-new", AuthorID, notification)
		}

	}
	return true, nil
}

func (S *Server) GetCommentAuthorID(commentID int) (int, error) {
	var userID int
	err := S.db.QueryRow("SELECT user_id FROM comments WHERE id = ?", commentID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}
