# 导航站点

这是一个基于Cloudflare Pages和Workers的导航站点项目。它使用Cloudflare D1作为数据库，支持用户认证和权限管理。

## 功能特点

- 响应式设计，支持移动端和桌面端
- 用户认证系统
- 管理员权限控制
- 分类和链接管理
- 自动检查链接有效性
- 美观的UI设计

## 技术栈

- 前端：HTML + TailwindCSS
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1
- 认证：JWT

## 部署步骤

1. 安装依赖：
```bash
npm install
```

2. 创建D1数据库：
```bash
wrangler d1 create bookmark_db
```

3. 更新wrangler.toml中的数据库ID：
```toml
[[d1_databases]]
binding = "DB"
database_name = "bookmark_db"
database_id = "你的数据库ID"
```

4. 初始化数据库：
```bash
wrangler d1 execute bookmark_db --file=./schema.sql
```

5. 部署Worker：
```bash
npm run deploy
```

6. 部署前端：
- 将`src/index.html`部署到Cloudflare Pages
- 更新`index.html`中的`API_BASE_URL`为你的Worker URL

## 开发

本地开发：
```bash
npm run dev
```

## 管理员账号

默认管理员账号：
- 邮箱：admin@example.com
- 密码：admin123

## 注意事项

- 请在生产环境中修改默认管理员密码
- 建议使用HTTPS进行安全传输
- 定期备份数据库
- 监控Worker的使用情况
