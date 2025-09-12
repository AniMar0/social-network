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
	// S.mux.HandleFunc("/api/user", S.UserHandler)
	// S.mux.HandleFunc("/api/user/status", S.UserStatusHandler)
}

func (S *Server) AddUser(user User) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	query := `INSERT INTO users (first_name, last_name, birthdate, age, avatar, nickname, about_me,email,password)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
		user.Gender)
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

func (S *Server) GetHashedPasswordFromDB(identifier string) (string, string, error) {
	var hashedPassword, id string

	err := S.db.QueryRow(`
		SELECT password, id FROM users 
		WHERE nickname = ? OR email = ?
	`, identifier, identifier).Scan(&id, &hashedPassword)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", fmt.Errorf("this user does not exist")
		}
		return "", "", err
	}
	return hashedPassword, id, nil
}

func (S *Server) MakeToken(Writer http.ResponseWriter, username string) {
	sessionID := uuid.NewV4().String()
	expirationTime := time.Now().Add(24 * time.Hour)

	_, err := S.db.Exec("INSERT INTO sessions (session_id, nickname, expires_at) VALUES (?, ?, ?)",
		sessionID, username, expirationTime)
	if err != nil {
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
