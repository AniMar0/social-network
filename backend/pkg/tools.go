package tools

import "time"

func GetAge(DateOfBirth string) int {
	birthTime, err := time.Parse("2006-01-02T15:04:05.000Z", DateOfBirth)
	if err != nil {
		panic(err)
	}
	now := time.Now()
	age := now.Year() - birthTime.Year()

	return age
}
