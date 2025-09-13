package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"database/sql"
	"fmt"
	"html"
	"log"
	"net/http"
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
	S.initRuts()

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
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

func (S *Server) initRuts() {
	S.mux.HandleFunc("/api/register", S.RegisterHandler)
	S.mux.HandleFunc("/api/upload-avatar", S.UploadAvatarHandler)

	S.mux.HandleFunc("/api/login", S.LoginHandler)
	// S.mux.HandleFunc("/api/logout", S.LogoutHandler)

	http.HandleFunc("/api/follow", S.FollowHandler)
	http.HandleFunc("/api/unfollow", S.UnfollowHandler)

	http.HandleFunc("/api/profile", S.ProfileHandler)
}

func (S *Server) AddUser(user User) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	query := `INSERT INTO users (first_name, last_name, birthdate, age, avatar, nickname, about_me,email,password,gender, url)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = S.db.Exec(query,
		html.EscapeString(user.FirstName),
		html.EscapeString(user.LastName),
		html.EscapeString(user.DateOfBirth),
		user.Age,
		html.EscapeString(user.AvatarUrl),
		html.EscapeString(user.Nickname),
		html.EscapeString(user.AboutMe),
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
	err := S.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = ? OR nickname = ?", user.Email, user.Nickname).Scan(&exists)
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
	})
}

func (S *Server) FollowUser(follower, following string) error {
	// ما تقدرش تتابع نفسك
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

func (S *Server) GetFollowersCount(nickname string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) FROM follows WHERE following = ?
	`, nickname)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (S *Server) GetFollowingCount(nickname string) (int, error) {
	row := S.db.QueryRow(`
		SELECT COUNT(*) FROM follows WHERE follower = ?
	`, nickname)

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

func (S *Server) GetUserData(url string) (UserData, error) {
	var user UserData

	// أولاً نجيب بيانات المستخدم
	err := S.db.QueryRow(`
		SELECT id, first_name, last_name, nickname, email, birthdate, avatar, about_me, is_private, created_at
		FROM users 
		WHERE url = ?
	`, url).Scan(
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
	)
	if err != nil {
		return UserData{}, err
	}

	user.FollowersCount, _ = S.GetFollowersCount(url)
	
	user.FollowingCount, _ = S.GetFollowingCount(url)

	// نجيب postsCount
	// row := S.db.QueryRow(`SELECT COUNT(*) FROM posts WHERE author_id = ?`, user.ID)
	// row.Scan(&user.PostsCount)

	return user, nil
}

