CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_comment_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
