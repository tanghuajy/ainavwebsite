DELETE FROM users;
INSERT INTO users (email, password_hash, is_admin) VALUES ('admin@example.com', '$2a$10$zGZNDs7Eg/mDQlvlNhCMy.B7aBCcGP6YpU8xUpPakRsGZIkkJ4FMG', 1); 