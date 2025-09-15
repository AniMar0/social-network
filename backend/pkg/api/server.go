package backend

import (
	"SOCIAL-NETWORK/pkg/db/sqlite"
	"database/sql"
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

	//user handlers
	S.mux.HandleFunc("/api/register", S.RegisterHandler)
	S.mux.HandleFunc("/api/upload-avatar", S.UploadAvatarHandler)
	S.mux.HandleFunc("/api/upload-post-file", S.UploadPostHandler)
	S.mux.HandleFunc("/api/user/update", S.UpdateProfileHandler)

	//auth handlers
	S.mux.HandleFunc("/api/login", S.LoginHandler)
	S.mux.HandleFunc("/api/logged", S.LoggedHandler)
	S.mux.HandleFunc("/api/logout", S.LogoutHandler)

	//follow handlers
	S.mux.HandleFunc("/api/follow", S.FollowHandler)
	S.mux.HandleFunc("/api/unfollow", S.UnfollowHandler)
	S.mux.HandleFunc("/api/cancel-follow-request", S.CancelFollowRequestHandler)
	S.mux.HandleFunc("/api/accept-follow-request", S.AcceptFollowRequestHandler)
	S.mux.HandleFunc("/api/decline-follow-request", S.DeclineFollowRequestHandler)
	S.mux.HandleFunc("/api/send-follow-request", S.SendFollowRequestHandler)

	//profile handlers
	S.mux.HandleFunc("/api/profile/", S.ProfileHandler)
	S.mux.HandleFunc("/api/me", S.MeHandler)

	//post handlers
	S.mux.HandleFunc("/api/like", S.LikeHandler)
	S.mux.Handle("/api/create-post", S.SessionMiddleware(http.HandlerFunc(S.CreatePostHandler)))
	//S.mux.HandleFunc("/api/load-posts", S.LoadPostsHandler)
	//S.mux.HandleFunc("/api/load-user-posts", S.LoadUserPostsHandler)
}
