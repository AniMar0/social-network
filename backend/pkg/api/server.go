package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"database/sql"
	"html"
	"log"
	"net/http"

	"github.com/rs/cors"
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
