package backend

import (
	tools "SOCIAL-NETWORK/pkg"
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

func (S *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	var user User
	err := json.NewDecoder(r.Body).Decode(&user)

	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err, found := S.UserFound(user)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if found {
		fmt.Println("User already exists")
		tools.SendJSONError(w, "User already exists", http.StatusConflict)
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
		tools.SendJSONError(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

func (S *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method != http.MethodPost {
		tools.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user LoginUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		tools.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if user.Identifier == "" || user.Password == "" {
		tools.SendJSONError(w, "Email and password are required", http.StatusBadRequest)
		return
	}
	url, hashedPassword, id, err := S.GetHashedPasswordFromDB(user.Identifier)
	if err != nil {
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	if err := tools.CheckPassword(hashedPassword, user.Password); err != nil {
		tools.SendJSONError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	S.MakeToken(w, id)

	userData, err := S.GetUserData(url, id)
	if err != nil {
		fmt.Println(err)
		tools.SendJSONError(w, "Failed to retrieve user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": userData,
	})

	// S.broadcastUserStatusChange()
}

func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("called AvatarHandeler")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		fmt.Println(err)
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

	id, _ := strconv.Atoi(user.ID)
	err := S.RemoveOldAvatar(id)
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

func (S *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fmt.Println("Method not allowed:", r.Method)
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "No session", http.StatusBadRequest)
		return
	}

	var userID int
	S.db.QueryRow("SELECT user_id FROM sessions WHERE session_id = ?", cookie.Value).Scan(&userID)

	_, err = S.db.Exec("DELETE FROM sessions WHERE session_id = ?", cookie.Value)
	if err != nil {
		http.Error(w, "Error deleting session", http.StatusInternalServerError)
		return
	}

	// S.RLock()
	// if clients, exists := S.clients[username]; exists {
	// 	for _, client := range clients {
	// 		client.Send <- map[string]string{
	// 			"event":   "logout",
	// 			"message": "Session terminated",
	// 		}
	// 		client.Conn.Close()
	// 	}
	// 	delete(S.clients, username)
	// }
	// S.RUnlock()

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})

	// Broadcast user status change to remaining connected clients
	// go func() {
	// 	time.Sleep(100 * time.Millisecond)
	// 	S.broadcastUserStatusChange()
	// }()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"logged out"}`))
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

	if strings.TrimSpace(post.Content) == "" {
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
