CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted', -- pending | accepted
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
);