package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/twinj/uuid"
)

func (S *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	var user User
	err := json.NewDecoder(r.Body).Decode(&user)

	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "Invalid request body", http.StatusBadRequest)
		return
	}

	err, found := S.UserFound(user)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if found {
		fmt.Println("User already exists")
		tools.RenderErrorPage(w, r, "Status Conflict", http.StatusConflict)
		return
	}

	user.Age = tools.GetAge(user.DateOfBirth)

	if user.Nickname == "" {
		user.Url = uuid.NewV4().String()
	} else {
		user.Url = user.Nickname
	}

	if err := S.AddUser(user); err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (S *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	var user LoginUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		tools.RenderErrorPage(w, r, "Bad Request", http.StatusBadRequest)
		return
	}
	if user.Identifier == "" || user.Password == "" {
		tools.RenderErrorPage(w, r, "Bad Request", http.StatusBadRequest)
		return
	}
	url, hashedPassword, id, err := S.GetHashedPasswordFromDB(user.Identifier)
	if err != nil {
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}
	if err := tools.CheckPassword(hashedPassword, user.Password); err != nil {
		tools.RenderErrorPage(w, r, "Incorrect password", http.StatusInternalServerError)
		return
	}

	S.MakeToken(w, id)

	userData, err := S.GetUserData(url, id)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": userData,
	})

	// S.broadcastUserStatusChange()
}

func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
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
	
	avatarPath := "uploads/" + uuid.NewV4().String() + tools.GetTheExtension(header.Filename)

	out, err := os.Create(avatarPath)
	if err != nil {
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

func (S *Server) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	// http://localhost:8080/api/profile?nickname=aniMaro
	url := r.URL.Query().Get("nickname")
	if url == "" {
		http.Error(w, "nickname required", http.StatusBadRequest)
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

	resp := map[string]interface{}{
		"followers": followers,
		"following": following,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
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

func (S *Server) LoggedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}
	id, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userData, err := S.GetUserData("", id)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":     userData,
		"loggedIn": true,
	})
}

func (S *Server) UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var user UserData
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	_, err := S.db.Exec(`
        UPDATE users
        SET first_name = ?, last_name = ?, nickname = ?, email = ?, birthdate = ?, avatar = ?, about_me = ?, is_private = ?
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Nickname, user.Email, user.DateOfBirth, user.Avatar, user.AboutMe, user.IsPrivate, user.ID,
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
