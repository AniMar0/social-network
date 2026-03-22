package postgresql

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
}

// DSN loads the database connection string from the .env file and sets it in the Config struct.
func (c *Config) DSN() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	c.DatabaseURL = os.Getenv("DATABASE_URL")
}

func ConectAndMigrate() {
	// Load database configuration
	var config Config
	config.DSN()	
	log.Printf("Database URL: %s", config.DatabaseURL)

	// Here you would add code to connect to the database and run migrations using the config.DatabaseURL
}
