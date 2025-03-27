-- 创建用户表
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入管理员用户 (密码: password123)
INSERT INTO users (email, password_hash, is_admin) 
VALUES ('admin@example.com', '$2a$10$zGZNDs7Eg/mDQlvlNhCMy.B7aBCcGP6YpU8xUpPakRsGZIkkJ4FMG', 1);

-- 创建分类表
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认分类
INSERT INTO categories (name, emoji) VALUES 
('图像', '🖼️'),
('视频', '🎥'),
('生产力', '⚡'),
('文本和写作', '✍️'),
('企业', '💼'),
('聊天机器人', '🤖');

-- 删除旧的链接表（如果存在）
DROP TABLE IF EXISTS links;

-- 创建链接表
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    visits INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 插入一些示例链接
INSERT INTO links (category_id, name, url, description, icon_url, is_featured) VALUES
(1, 'Midjourney', 'https://www.midjourney.com', 'AI图像生成工具', 'https://www.midjourney.com/favicon.ico', 1),
(1, 'DALL-E', 'https://labs.openai.com', 'OpenAI的图像生成AI', 'https://labs.openai.com/favicon.ico', 1),
(2, 'RunwayML', 'https://runwayml.com', 'AI视频编辑和生成', 'https://runwayml.com/favicon.ico', 1),
(3, 'ChatGPT', 'https://chat.openai.com', '强大的AI助手', 'https://chat.openai.com/favicon.ico', 1),
(4, 'Copy.ai', 'https://www.copy.ai', 'AI文案写作助手', 'https://www.copy.ai/favicon.ico', 1),
(5, 'Claude', 'https://claude.ai', '企业级AI助手', 'https://claude.ai/favicon.ico', 1);

-- 创建访问记录表
CREATE TABLE visit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(id)
); 