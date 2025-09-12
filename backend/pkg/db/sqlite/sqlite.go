package sqlite

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// ConnectAndMigrate opens a SQLite connection and applies migrations
func ConnectAndMigrate(dbPath string, migrationsDir string) *sql.DB {
	// Open SQLite connection
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	// Verify that the connection works
	if err := db.Ping(); err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	// Get absolute path of migrations folder
	absMigrations, err := filepath.Abs(migrationsDir)
	if err != nil {
		log.Fatalf("Error getting migrations path: %v", err)
	}

	// Convert path to URL format (works on Windows and Linux)
	u := url.URL{
		Scheme: "file",
		Path:   filepath.ToSlash(absMigrations), // convert backslashes to forward slashes
	}
	migrationsPath := u.String()

	// Database URL for golang-migrate
	dbURL := fmt.Sprintf("sqlite3://%s", dbPath)

	// Initialize migrate instance
	m, err := migrate.New(migrationsPath, dbURL)
	if err != nil {
		// Note: this can fail if migration files are missing or invalid
		log.Fatalf("Error initializing migrate: %v", err)
	}

	// Apply all up migrations (ignore if there are no new changes)
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Error applying migrations: %v", err)
	}

	log.Println("Migrations applied successfully or already up-to-date")
	return db
}
