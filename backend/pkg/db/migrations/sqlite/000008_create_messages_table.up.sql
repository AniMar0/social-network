CREATE TABLE messages (
    backend_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT,
    type TEXT CHECK(type IN ('text', 'emoji', 'gif', 'image')),
    reply_to TEXT,
    is_read BOOLEAN DEFAULT 0,
    read_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id),
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(reply_to) REFERENCES messages(id)
);