import { Router } from 'itty-router';
import { jwtVerify, SignJWT } from 'jose';
import { hash, compare } from 'bcryptjs';

const router = Router();

// 中间件：验证JWT
async function authMiddleware(request, env) {
  const authHeader = request.headers.get('Authorization');
  console.log("验证JWT - 授权头:", authHeader ? "存在" : "不存在");
  if (!authHeader) return null;

  try {
    const token = authHeader.split(' ')[1];
    console.log("解析JWT token...");
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(env.JWT_SECRET)
    );
    console.log("JWT有效，用户:", payload.email, "管理员:", payload.isAdmin);
    return payload;
  } catch (err) {
    console.error("JWT验证失败:", err);
    return null;
  }
}

// 中间件：检查管理员权限
async function adminMiddleware(request, env) {
  console.log("检查管理员权限...");
  const user = await authMiddleware(request, env);
  console.log("用户信息:", user);
  if (!user || !user.isAdmin) {
    console.error("管理员权限检查失败:", !user ? "未认证" : "非管理员");
    return new Response('Unauthorized', { status: 401 });
  }
  console.log("管理员权限验证通过");
  return null;
}

// 路由：获取所有分类和链接
router.get('/api/categories', async (request, env) => {
  const categories = await env.DB.prepare(`
    SELECT c.*, json_group_array(
      json_object(
        'id', l.id,
        'name', l.name,
        'url', l.url,
        'description', l.description,
        'icon_url', l.icon_url,
        'visits', l.visits
      )
    ) as links
    FROM categories c
    LEFT JOIN links l ON c.id = l.category_id
    GROUP BY c.id
  `).all();

  return Response.json(categories.results);
});

// 路由：添加分类
router.post('/api/categories', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { name, emoji, description } = await request.json();
  const result = await env.DB.prepare(`
    INSERT INTO categories (name, emoji, description)
    VALUES (?, ?, ?)
  `).bind(name, emoji, description).run();

  return Response.json({ id: result.meta.last_row_id });
});

// 路由：更新分类
router.put('/api/categories/:id', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { id } = request.params;
  const { name, emoji, description } = await request.json();
  await env.DB.prepare(`
    UPDATE categories
    SET name = ?, emoji = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, emoji, description, id).run();

  return Response.json({ success: true });
});

// 路由：删除分类
router.delete('/api/categories/:id', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { id } = request.params;
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
});

// 路由：添加链接
router.post('/api/links', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { category_id, name, url, description } = await request.json();
  const icon_url = await getFavicon(url);
  
  const result = await env.DB.prepare(`
    INSERT INTO links (category_id, name, url, description, icon_url)
    VALUES (?, ?, ?, ?, ?)
  `).bind(category_id, name, url, description, icon_url).run();

  return Response.json({ id: result.meta.last_row_id });
});

// 路由：更新链接
router.put('/api/links/:id', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { id } = request.params;
  const { name, url, description } = await request.json();
  const icon_url = await getFavicon(url);
  
  await env.DB.prepare(`
    UPDATE links
    SET name = ?, url = ?, description = ?, icon_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, url, description, icon_url, id).run();

  return Response.json({ success: true });
});

// 路由：删除链接
router.delete('/api/links/:id', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { id } = request.params;
  await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
});

// 路由：记录访问
router.post('/api/links/:id/visit', async (request, env) => {
  const { id } = request.params;
  const ip = request.headers.get('CF-Connecting-IP');
  const userAgent = request.headers.get('User-Agent');

  // 记录访问日志
  await env.DB.prepare(`
    INSERT INTO visit_logs (link_id, ip_address, user_agent)
    VALUES (?, ?, ?)
  `).bind(id, ip, userAgent).run();

  // 更新访问计数
  await env.DB.prepare(`
    UPDATE links
    SET visits = visits + 1
    WHERE id = ?
  `).bind(id).run();

  return Response.json({ success: true });
});

// 路由：提交工具
router.post('/api/submissions', async (request, env) => {
  console.log("收到提交工具请求");
  const user = await authMiddleware(request, env);
  if (!user) {
    console.error("提交工具未授权");
    return new Response('Unauthorized', { status: 401 });
  }

  const data = await request.json();
  console.log("提交数据:", data);
  const { name, url, description, category_id } = data;
  
  // 验证必要字段
  if (!name || !url || !category_id) {
    console.error("提交缺少必要字段");
    return Response.json({ error: '名称、链接和分类不能为空' }, { status: 400 });
  }
  
  try {
    // 保存提交
    console.log("保存提交到数据库...");
    const result = await env.DB.prepare(`
      INSERT INTO submissions (user_id, name, url, description, category_id, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(user.id, name, url, description, category_id).run();
    
    console.log("提交保存成功, ID:", result.meta.last_row_id);
    return Response.json({ id: result.meta.last_row_id });
  } catch (error) {
    console.error("保存提交出错:", error);
    return Response.json({ error: '保存提交失败' }, { status: 500 });
  }
});

// 路由：获取所有待审核提交
router.get('/api/submissions', async (request, env) => {
  console.log("收到获取提交请求");
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) {
    console.error("获取提交未授权");
    return adminCheck;
  }

  try {
    console.log("从数据库获取提交...");
    const submissions = await env.DB.prepare(`
      SELECT s.*, u.email as user_email
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC
    `).all();
    
    console.log("获取到待审核提交:", submissions.results.length, "个");
    return Response.json(submissions.results);
  } catch (error) {
    console.error("获取提交出错:", error);
    return Response.json({ error: '获取提交失败' }, { status: 500 });
  }
});

// 路由：审核提交
router.post('/api/submissions/:id/review', async (request, env) => {
  console.log("收到审核提交请求, ID:", request.params.id);
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) {
    console.error("审核提交未授权");
    return adminCheck;
  }

  const { id } = request.params;
  const data = await request.json();
  console.log("审核数据:", data);
  const { status, admin_comment } = data;
  
  // 验证状态值
  if (status !== 'approved' && status !== 'rejected') {
    console.error("审核状态无效:", status);
    return Response.json({ error: '状态值无效' }, { status: 400 });
  }
  
  try {
    // 更新提交状态
    console.log("更新提交状态...");
    await env.DB.prepare(`
      UPDATE submissions
      SET status = ?, admin_comment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, admin_comment, id).run();
    
    // 如果审核通过，添加到链接表
    if (status === 'approved') {
      console.log("审核通过，获取提交详情...");
      const submission = await env.DB.prepare(`
        SELECT * FROM submissions WHERE id = ?
      `).bind(id).first();
      
      if (submission) {
        console.log("获取到提交详情:", submission);
        const icon_url = await getFavicon(submission.url);
        console.log("获取到图标URL:", icon_url);
        
        console.log("添加到链接表...");
        const result = await env.DB.prepare(`
          INSERT INTO links (category_id, name, url, description, icon_url)
          VALUES (?, ?, ?, ?, ?)
        `).bind(submission.category_id, submission.name, submission.url, submission.description, icon_url).run();
        
        console.log("链接添加成功, ID:", result.meta.last_row_id);
      } else {
        console.error("未找到提交详情");
      }
    } else {
      console.log("审核拒绝");
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error("审核出错:", error);
    return Response.json({ error: '审核失败' }, { status: 500 });
  }
});

// 路由：用户登录
router.post('/api/login', async (request, env) => {
  const { email, password } = await request.json();
  console.log("登录尝试:", email);
  
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(email).first();

  if (!user) {
    console.log("用户不存在:", email);
    return Response.json({ error: '用户不存在' }, { status: 401 });
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    console.log("密码错误:", email);
    return Response.json({ error: '密码错误' }, { status: 401 });
  }

  const token = await new SignJWT({ 
    id: user.id, 
    email: user.email, 
    isAdmin: user.is_admin 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  console.log("登录成功:", email);
  return Response.json({ token });
});

// 获取网站图标
async function getFavicon(url) {
  try {
    const domain = new URL(url).origin;
    const response = await fetch(`${domain}/favicon.ico`);
    if (response.ok) {
      return `${domain}/favicon.ico`;
    }
  } catch (err) {
    console.error('获取图标失败:', err);
  }
  return null;
}

// 处理CORS
function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    // 处理CORS预检请求
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;
    
    // 处理API请求
    const response = await router.handle(request, env, ctx);
    if (response) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }
    
    // 如果没有匹配的路由
    return new Response('Not Found', { status: 404 });
  }
}; 