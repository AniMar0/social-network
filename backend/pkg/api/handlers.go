package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func (S *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	err, found := S.UserFound(user)
	if err != nil {
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if found {
		tools.RenderErrorPage(w, r, "Status Conflict", http.StatusConflict)
		return
	}

	user.Age = tools.GetAge(user.DateOfBirth)
	if err := S.AddUser(user); err != nil {
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "Cannot read avatar", http.StatusBadRequest)
		return
	}
	defer file.Close()

	avatarPath := "uploads/" + header.Filename

	fmt.Println(avatarPath)

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
