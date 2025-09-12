package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/rs/cors"
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
    S.mux.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "login successfully")
    })
}

