package db

import (
	"context"
	"log"
	"os"
	"sync"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var (
	pool     *pgxpool.Pool
	poolOnce sync.Once
)

// InitDB initializes and returns the global pgx connection pool.
func InitDB() *pgxpool.Pool {
	poolOnce.Do(func() {
		if err := godotenv.Load(); err != nil {
			log.Printf(".env not loaded, using system environment variables: %v", err)
		}

		databaseURL := os.Getenv("DATABASE_URL")
		if databaseURL == "" {
			log.Fatal("DATABASE_URL is required")
		}

		var err error
		pool, err = pgxpool.New(context.Background(), databaseURL)
		if err != nil {
			log.Fatalf("failed to create pgx pool: %v", err)
		}

		if err = pool.Ping(context.Background()); err != nil {
			log.Fatalf("failed to ping postgres: %v", err)
		}
	})

	return pool
}

// DB wraps pgxpool to preserve existing query call sites while using context internally.
type DB struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *DB {
	return &DB{pool: pool}
}

func (d *DB) Close() {
	if d.pool != nil {
		d.pool.Close()
	}
}

func (d *DB) Exec(query string, args ...any) (pgconn.CommandTag, error) {
	return d.pool.Exec(context.Background(), query, args...)
}

func (d *DB) ExecContext(ctx context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	return d.pool.Exec(ctx, query, args...)
}

func (d *DB) Query(query string, args ...any) (pgx.Rows, error) {
	return d.pool.Query(context.Background(), query, args...)
}

func (d *DB) QueryContext(ctx context.Context, query string, args ...any) (pgx.Rows, error) {
	return d.pool.Query(ctx, query, args...)
}

func (d *DB) QueryRow(query string, args ...any) pgx.Row {
	return d.pool.QueryRow(context.Background(), query, args...)
}

func (d *DB) QueryRowContext(ctx context.Context, query string, args ...any) pgx.Row {
	return d.pool.QueryRow(ctx, query, args...)
}

func (d *DB) Begin() (*Tx, error) {
	tx, err := d.pool.Begin(context.Background())
	if err != nil {
		return nil, err
	}
	return &Tx{tx: tx}, nil
}

type Tx struct {
	tx pgx.Tx
}

func (t *Tx) Exec(query string, args ...any) (pgconn.CommandTag, error) {
	return t.tx.Exec(context.Background(), query, args...)
}

func (t *Tx) Query(query string, args ...any) (pgx.Rows, error) {
	return t.tx.Query(context.Background(), query, args...)
}

func (t *Tx) QueryRow(query string, args ...any) pgx.Row {
	return t.tx.QueryRow(context.Background(), query, args...)
}

func (t *Tx) Commit() error {
	return t.tx.Commit(context.Background())
}

func (t *Tx) Rollback() error {
	return t.tx.Rollback(context.Background())
}
