package backend

import (
	"encoding/json"
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

	err = S.CreateComment(currentUserID, body.Content, body.PostID, body.ParentCommentId)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Comment created successfully",
	})
}

func (S *Server) CreateComment(userID int, content string, postID int, parentCommentID *int) error {
	_, err := S.db.Exec("INSERT INTO comments (user_id, content, post_id, parent_comment_id) VALUES (?, ?, ?, ?)", userID, content, postID, parentCommentID)
	if err != nil {
		return err
	}
	return nil
}
