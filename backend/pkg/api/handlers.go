package backend

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
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

	birthTime, err := time.Parse("2006-01-02T15:04:05.000Z", user.DateOfBirth)
	if err != nil {
		panic(err)
	}
	now := time.Now()
	age := now.Year() - birthTime.Year()

	log.Println("New registration:", age)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Registration successful"}`))
}

func (S *Server) UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// قراءة ملف الصورة من الفورم
	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "Cannot read avatar", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// تحديد مسار الحفظ
	avatarPath := "uploads/" + header.Filename

	// إنشاء الملف على الخادم
	out, err := os.Create(avatarPath)
	if err != nil {
		http.Error(w, "Cannot save avatar", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	// نسخ محتوى الصورة
	_, err = io.Copy(out, file)
	if err != nil {
		http.Error(w, "Failed to save avatar", http.StatusInternalServerError)
		return
	}

	// إعادة رابط الصورة
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"avatarUrl": "/%s"}`, avatarPath)))
}
