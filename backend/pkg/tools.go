package tools

import (
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func GetAge(DateOfBirth string) int {
	birthTime, err := time.Parse("2006-01-02T15:04:05.000Z", DateOfBirth)
	if err != nil {
		panic(err)
	}
	now := time.Now()
	age := now.Year() - birthTime.Year()

	return age
}

func CheckPassword(hashedPassword, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err
}

func RenderErrorPage(w http.ResponseWriter, r *http.Request, errMsg string, errCode int) {
	http.ServeFile(w, r, "./static/index.html")
}
