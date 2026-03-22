package postgresql

import (
	"database/sql"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type Config struct {
	DatabaseURL string
}

func (c *Config) DSN() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	c.DatabaseURL = os.Getenv("DATABASE_URL")
}

func (c *Config) ConnectAndMigrate() *sql.DB {
	c.DSN()

	// Open a database/sql connection used by handlers.
	db, err := sql.Open("postgres", c.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Run migrations using golang-migrate
	m, err := migrate.New(
		"file://pkg/db/migrations/postgresql",
		c.DatabaseURL,
	)
	if err != nil {
		log.Fatalf("Failed to initialize migrate: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("✅ Migrations completed successfully")
	return db
}
