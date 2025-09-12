package backend

import (
	tools "SOCIAL-NETWORK/pkg"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/twinj/uuid"
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
		tools.RenderErrorPage(w, r, "Invalid request body", http.StatusBadRequest)
		return
	}

	err, found := S.UserFound(user)
	if err != nil {
		fmt.Println(err)
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	if found {
		fmt.Println("User already exists")
		tools.RenderErrorPage(w, r, "Status Conflict", http.StatusConflict)
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
		tools.RenderErrorPage(w, r, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

func (S *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/404", http.StatusSeeOther)
		return
	}

	var user LoginUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		tools.RenderErrorPage(w, r, "Bad Request", http.StatusBadRequest)
		return
	}
	if user.Identifier == "" || user.Password == "" {
		tools.RenderErrorPage(w, r, "Bad Request", http.StatusBadRequest)
		return
	}
	FirstName, hashedPassword, id, err := S.GetHashedPasswordFromDB(user.Identifier)
	if err != nil {
		tools.RenderErrorPage(w, r, "User Not Found", http.StatusBadRequest)
		return
	}
	if err := tools.CheckPassword(hashedPassword, user.Password); err != nil {
		tools.RenderErrorPage(w, r, "Incorrect password", http.StatusInternalServerError)
		return
	}

	S.MakeToken(w, id)

	fmt.Println(FirstName, id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"FirstName": FirstName,
	})

	// S.broadcastUserStatusChange()
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
