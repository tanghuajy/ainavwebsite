CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 

INSERT INTO users (email, password_hash, is_admin) 
VALUES ('admin@example.com', '$2a$10$zGZNDs7Eg/mDQlvlNhCMy.B7aBCcGP6YpU8xUpPakRsGZIkkJ4FMG', 1); 