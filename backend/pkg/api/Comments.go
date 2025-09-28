package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
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
	fmt.Println(commentID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Comment created successfully",
	})
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
			c.id, c.content, c.created_at, c.parent_id,
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

func (S *Server) GetCommentByID(commentID int, r *http.Request) (*Comment, error) {
	currentUserID, _, _ := S.CheckSession(r)

	row := S.db.QueryRow(`
		SELECT 
			c.id, c.content, c.created_at, c.parent_id,
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
			return nil, nil // comment not found
		}
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
	
	return &comment, nil
}
