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
	conn *pgx.Conn
}

// DSN loads the database connection string from the .env file and sets it in the Config struct.
func (c *Config) DSN() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	c.DatabaseURL = os.Getenv("DATABASE_URL")
}

func (c *Config) ConnectAndMigrate() {
	// Load database configuration
	c.DSN()

	// Here you would add code to connect to the database and run migrations using the config.DatabaseURL
	var err error
	c.conn, err = pgx.Connect(context.Background(), c.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer c.conn.Close(context.Background())
	
}
