package postgresql

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
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

	// Here you would add code to connect to the database and run migrations using the config.DatabaseURL
	conn, err := pgx.Connect(context.Background(), config.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer conn.Close(context.Background())

	// Example query to test connection
	var version string
	if err := conn.QueryRow(context.Background(), "SELECT version()").Scan(&version); err != nil {
		log.Fatalf("Query failed: %v", err)
	}

	log.Println("Connected to:", version)
}
