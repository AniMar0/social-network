package postgresql

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres" // 🔹 مهم بزاف
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type Config struct {
	DatabaseURL string
	pool        *pgxpool.Pool
}

func (c *Config) DSN() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	c.DatabaseURL = os.Getenv("DATABASE_URL")
}

func (c *Config) ConnectAndMigrate() {
	c.DSN()

	// Connect to the database using pgxpool (test connection)
	pool, err := pgxpool.New(context.Background(), c.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer pool.Close()
	c.pool = pool

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
}