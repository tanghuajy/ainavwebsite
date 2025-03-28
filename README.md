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

## 部署说明

### 快速部署

使用Windows系统可以直接运行以下命令进行部署：
```bash
npm run deploy:windows
```

这个命令会按顺序执行以下部署脚本：

1. `deploy-step1.ps1`：第一步部署
   - 检查并安装 wrangler
   - 检查 Cloudflare 登录状态
   - 创建 D1 数据库
   - 更新 wrangler.toml 配置
   - 保存数据库 ID 到文件

2. `deploy-step2.ps1`：第二步部署
   - 读取数据库 ID
   - 初始化数据库（执行 schema.sql）
   - 生成 JWT 密钥
   - 设置环境变量
   - 部署 Worker
   - 更新前端 API URL
   - 部署前端到 Pages

3. `deploy-frontend.ps1`：前端部署（可选）
   - 检查并安装 wrangler
   - 检查 Cloudflare 登录状态
   - 检查/设置 JWT_SECRET
   - 部署前端到 Pages
   - 部署 Functions

部署完成后，您将获得：
- Cloudflare Pages URL（您的网站地址）
- 管理员账号：admin@example.com
- 管理员密码：123456

### 手动部署步骤

如果您想手动控制部署过程，可以按以下步骤操作：

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
wrangler deploy
```

6. 部署前端：
```bash
wrangler pages deploy src --project-name ainavwebsite
```

## 开发

本地开发：
```bash
npm run dev
```

## 管理员账号

默认管理员账号：
- 邮箱：admin@example.com
- 密码：123456

## 注意事项

- 请在部署完成后立即修改默认管理员密码
- 确保您的Cloudflare账号已经登录
- 建议使用HTTPS进行安全传输
- 定期备份数据库
- 监控Worker的使用情况

## 常见问题

1. 部署失败：
   - 确保已安装最新版本的 wrangler
   - 检查 Cloudflare 登录状态
   - 检查数据库 ID 是否正确

2. 访问出错：
   - 确认 Worker URL 配置正确
   - 检查 JWT_SECRET 是否已设置
   - 验证数据库连接是否正常

3. 中文显示乱码：
   - 确保所有文件使用 UTF-8 编码
   - 检查 Content-Type 头部设置

## 技术支持

如果您在部署过程中遇到问题，请：
1. 检查控制台错误信息
2. 查看 Cloudflare 仪表板中的日志
3. 提交 Issue 获取帮助