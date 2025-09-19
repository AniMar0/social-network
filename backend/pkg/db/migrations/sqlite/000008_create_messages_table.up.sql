CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT,
    type TEXT CHECK(type IN ('text', 'emoji', 'gif', 'image')),
    reply_to INTEGER,
    is_read BOOLEAN DEFAULT 0,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id),
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(reply_to) REFERENCES messages(id)
);