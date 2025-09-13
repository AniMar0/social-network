package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"context"
	"database/sql"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/rs/cors"
	"github.com/twinj/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Server struct {
	db  *sql.DB
	mux *http.ServeMux
}

func (S *Server) Run(addr string) {
	S.db = sqlite.ConnectAndMigrate("pkg/db/migrations/app.db", "pkg/db/migrations/sqlite")
	defer S.db.Close()

	S.mux = http.NewServeMux()
	S.initRoutes()

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	})

	// Wrap mux with CORS
	handler := c.Handler(S.mux)

	log.Printf("Backend listening on :%s", addr)
	if err := http.ListenAndServe(":"+addr, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func (S *Server) initRoutes() {
	S.mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	S.mux.HandleFunc("/api/register", S.RegisterHandler)
	S.mux.HandleFunc("/api/upload-avatar", S.UploadAvatarHandler)
	S.mux.HandleFunc("/api/user/update", S.UpdateUserHandler)

	S.mux.HandleFunc("/api/login", S.LoginHandler)
	S.mux.HandleFunc("/api/logged", S.LoggedHandler)
	S.mux.HandleFunc("/api/logout", S.LogoutHandler)

	S.mux.HandleFunc("/api/follow", S.FollowHandler)
	S.mux.HandleFunc("/api/unfollow", S.UnfollowHandler)

	S.mux.HandleFunc("/api/profile/", S.ProfileHandler)

	S.mux.Handle("/api/create-post", S.SessionMiddleware(http.HandlerFunc(S.CreatePostHandler)))
	//S.mux.HandleFunc("/api/load-posts", S.LoadPostsHandler)
	//S.mux.HandleFunc("/api/load-user-posts", S.LoadUserPostsHandler)
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

func (S *Server) MakeToken(Writer http.ResponseWriter, id int) {
	sessionID := uuid.NewV4().String()
	expirationTime := time.Now().Add(24 * time.Hour)

	_, err := S.db.Exec("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, id, expirationTime)
	if err != nil {
		fmt.Println("Error creating session:", err)
		http.Error(Writer, "Error creating session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(Writer, &http.Cookie{
		Name:     "session_token",
		Value:    sessionID,
		Expires:  expirationTime,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Secure:   false,
	})
}

func (S *Server) FollowUser(follower, following string) error {
	if follower == following {
		return fmt.Errorf("you cannot follow yourself")
	}

	_, err := S.db.Exec(`
		INSERT INTO follows (follower, following) VALUES (?, ?)
		ON CONFLICT(follower, following) DO NOTHING
	`, follower, following)

	return err
}

func (S *Server) UnfollowUser(follower, following string) error {
	_, err := S.db.Exec(`
		DELETE FROM follows WHERE follower = ? AND following = ?
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


func (S *Server) CheckSession(r *http.Request) (int, string, error) {

	cookie, err := r.Cookie("session_token")
	if err != nil {
		return 0, "", fmt.Errorf("no session cookie")
	}
	sessionID := cookie.Value
	var userID int
	err = S.db.QueryRow(`
        SELECT user_id FROM sessions 
        WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP
    `, sessionID).Scan(&userID)

	if err != nil {
		return 0, "", fmt.Errorf("invalid or expired session")
	}
	return userID, sessionID, nil
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

func (S *Server) RemoveOldAvatar(userID int) error {
	// Get the avatar filename from the database
	var avatar string
	err := S.db.QueryRow(`SELECT avatar FROM users WHERE id = ?`, userID).Scan(&avatar)
	if err != nil {
		return err
	}

	if avatar == "/uploads/default.jpg" {
		return nil
	}
	// Remove the avatar file from uploads folder if it exists and is not empty
	if avatar != "" {
		avatarPath := fmt.Sprintf(".%s", avatar)
		if err := os.Remove(avatarPath); err != nil && !os.IsNotExist(err) {
			return err
		}
	}

	return nil
}

func (S *Server) SessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, _, err := S.CheckSession(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "username", username)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
