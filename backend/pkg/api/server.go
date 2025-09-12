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
	var hashedPassword, FirstName string
	var id int

	err := S.db.QueryRow(`
		SELECT password, id, first_name FROM users 
		WHERE nickname = ? OR email = ?
	`, identifier, identifier).Scan(&hashedPassword, &id, &FirstName)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", 0, fmt.Errorf("this user does not exist")
		}
		return "", "", 0, err
	}
	return FirstName, hashedPassword, id, nil
}

func (S *Server) MakeToken(Writer http.ResponseWriter, id int) {
	sessionID := uuid.NewV4().String()
	expirationTime := time.Now().Add(24 * time.Hour)

	fmt.Println("Creating session for user ID:", id)

	_, err := S.db.Exec("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, id, expirationTime)
	if err != nil {
		fmt.Println("Error creating session:", err)
		http.Error(Writer, "Error creating session", http.StatusInternalServerError)
		return
	}

	fmt.Println("Session created with ID:", sessionID)

	http.SetCookie(Writer, &http.Cookie{
		Name:     "session_token",
		Value:    sessionID,
		Expires:  expirationTime,
		HttpOnly: true,
	})
}
