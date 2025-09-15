package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"time"

	"github.com/twinj/uuid"
	"golang.org/x/crypto/bcrypt"
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

func (S *Server) MeHandler(w http.ResponseWriter, r *http.Request) {
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
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userData)
}

func (S *Server) AddUser(user User) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Handle nullable nickname - insert NULL if empty
	var nickname interface{}
	if user.Nickname == "" {
		nickname = nil
	} else {
		nickname = html.EscapeString(user.Nickname)
	}

	// Handle nullable aboutMe - insert NULL if empty
	var aboutMe interface{}
	if user.AboutMe == "" {
		aboutMe = nil
	} else {
		aboutMe = html.EscapeString(user.AboutMe)
	}

	query := `INSERT INTO users (first_name, last_name, birthdate, age, avatar, nickname, about_me,email,password,gender, url)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = S.db.Exec(query,
		html.EscapeString(user.FirstName),
		html.EscapeString(user.LastName),
		html.EscapeString(user.DateOfBirth),
		user.Age,
		html.EscapeString(user.AvatarUrl),
		nickname,
		aboutMe,
		html.EscapeString(user.Email),
		string(hashedPassword),
		html.EscapeString(user.Gender),
		html.EscapeString(user.Url))
	if err != nil {
		return err
	}
	return nil
}

func (S *Server) GetHashedPasswordFromDB(identifier string) (string, string, int, error) {
	var hashedPassword, url string
	var id int

	err := S.db.QueryRow(`
		SELECT password, id, url FROM users 
		WHERE nickname = ? OR email = ?
	`, identifier, identifier).Scan(&hashedPassword, &id, &url)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", 0, fmt.Errorf("this user does not exist")
		}
		return "", "", 0, err
	}
	return url, hashedPassword, id, nil
}

func (S *Server) GetUserData(url string, id int) (UserData, error) {
	var user UserData

	err := S.db.QueryRow(`
		SELECT id, first_name, last_name, nickname, email, birthdate, avatar, about_me, is_private, created_at, url
		FROM users 
		WHERE url = ? OR id = ?
	`, url, id).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Nickname,
		&user.Email,
		&user.DateOfBirth,
		&user.Avatar,
		&user.AboutMe,
		&user.IsPrivate,
		&user.JoinedDate,
		&user.Url,
	)
	if err != nil {
		return UserData{}, err
	}

	user.FollowersCount, _ = S.GetFollowersCount(url)

	user.FollowingCount, _ = S.GetFollowingCount(url)

	// row := S.db.QueryRow(`SELECT COUNT(*) FROM posts WHERE author_id = ?`, user.ID)
	// row.Scan(&user.PostsCount)

	return user, nil
}

// GET /api/notifications
func (S *Server) GetNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	userID, _, err := S.CheckSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := S.db.Query(`
		SELECT n.id, n.type, n.content, n.is_read, n.created_at,
		       u.id, u.first_name, u.last_name, u.avatar
		FROM notifications n
		JOIN users u ON u.id = n.actor_id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, "DB error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var notifs []map[string]interface{}
	for rows.Next() {
		var notif Notification
		if err := rows.Scan(&notif.ID, &notif.Type, &notif.Content, &notif.IsRead, &notif.CreatedAt,
			&notif.ActorID, &notif.FirstName, &notif.LastName, &notif.Avatar); err != nil {
			http.Error(w, "Error scanning row: "+err.Error(), http.StatusInternalServerError)
			return
		}

		notifs = append(notifs, map[string]interface{}{
			"id":        notif.ID,
			"type":      notif.Type,
			"content":   notif.Content,
			"isRead":    notif.IsRead,
			"timestamp": notif.CreatedAt,
			"user": map[string]interface{}{
				"id":     notif.ActorID,
				"name":   notif.FirstName + " " + notif.LastName,
				"avatar": notif.Avatar,
			},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

func (S *Server) IsertNotification(notif Notification) error {
	_, err := S.db.Exec(`
		INSERT INTO notifications (user_id, actor_id, type, content, is_read)
		VALUES (?, ?, ?, ?, ?)
	`, notif.ID, notif.ActorID, notif.Type, notif.Content, notif.IsRead)
	return err
}