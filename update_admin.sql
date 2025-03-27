-- 更新管理员密码
UPDATE users SET password_hash = '$2a$10$zGZNDs7Eg/mDQlvlNhCMy.B7aBCcGP6YpU8xUpPakRsGZIkkJ4FMG' WHERE email = 'admin@example.com'; 