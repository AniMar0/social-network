package backend

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type DB struct {
	inner *sql.DB
}

type Tx struct {
	inner *sql.Tx
}

func NewDB(inner *sql.DB) *DB {
	return &DB{inner: inner}
}

func (db *DB) Close() error {
	return db.inner.Close()
}

func (db *DB) Begin() (*Tx, error) {
	tx, err := db.inner.Begin()
	if err != nil {
		return nil, err
	}
	return &Tx{inner: tx}, nil
}

func (db *DB) Exec(query string, args ...any) (sql.Result, error) {
	return db.inner.Exec(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (db *DB) Query(query string, args ...any) (*sql.Rows, error) {
	return db.inner.Query(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (db *DB) QueryRow(query string, args ...any) *sql.Row {
	return db.inner.QueryRow(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (db *DB) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return db.inner.ExecContext(ctx, sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (db *DB) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return db.inner.QueryContext(ctx, sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (db *DB) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return db.inner.QueryRowContext(ctx, sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (tx *Tx) Exec(query string, args ...any) (sql.Result, error) {
	return tx.inner.Exec(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (tx *Tx) Query(query string, args ...any) (*sql.Rows, error) {
	return tx.inner.Query(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (tx *Tx) QueryRow(query string, args ...any) *sql.Row {
	return tx.inner.QueryRow(sqlx.Rebind(sqlx.DOLLAR, query), args...)
}

func (tx *Tx) Commit() error {
	return tx.inner.Commit()
}

func (tx *Tx) Rollback() error {
	return tx.inner.Rollback()
}
