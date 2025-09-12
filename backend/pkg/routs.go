package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"fmt"
	"log"
	"net/http"
)

type Server struct {
}

func (S *Server) Run() {
	db := sqlite.ConnectAndMigrate("pkg/db/migrations/app.db", "pkg/db/migrations/sqlite")
	defer db.Close()

	http.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "register successfully")
	})
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "login successfully")
	})
	addr := ":8080"
	log.Printf("Backend listening on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
