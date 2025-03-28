import { Router } from 'itty-router';
import { jwtVerify, SignJWT } from 'jose';
import { hash, compare } from 'bcryptjs';

const router = Router();

// 中间件：验证JWT
async function authMiddleware(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  try {
    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(env.JWT_SECRET)
    );
    return payload;
  } catch (err) {
    return null;
  }
}

// 中间件：检查管理员权限
async function adminMiddleware(request, env) {
  const user = await authMiddleware(request, env);
  if (!user || !user.isAdmin) {
    return new Response('Unauthorized', { status: 401 });
  }
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

// 路由：用户登录
router.post('/api/login', async (request, env) => {
  const { email, password } = await request.json();
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(email).first();

  if (!user) {
    return Response.json({ error: '用户不存在' }, { status: 401 });
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
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

  return Response.json({ token });
});

// 路由：提交新工具申请
router.post('/api/submissions', async (request, env) => {
  const user = await authMiddleware(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { name, url, description } = await request.json();
  const result = await env.DB.prepare(`
    INSERT INTO submissions (user_id, name, url, description)
    VALUES (?, ?, ?, ?)
  `).bind(user.id, name, url, description).run();

  return Response.json({ id: result.meta.last_row_id });
});

// 路由：获取所有申请（管理员）
router.get('/api/submissions', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const submissions = await env.DB.prepare(`
    SELECT s.*, u.email as user_email
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();

  return Response.json(submissions.results);
});

// 路由：审核申请
router.put('/api/submissions/:id', async (request, env) => {
  const adminCheck = await adminMiddleware(request, env);
  if (adminCheck) return adminCheck;

  const { id } = request.params;
  const { status, admin_comment } = await request.json();
  
  await env.DB.prepare(`
    UPDATE submissions
    SET status = ?, admin_comment = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, admin_comment, id).run();

  // 如果审核通过，自动添加到链接列表
  if (status === 'approved') {
    const submission = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
    const icon_url = await getFavicon(submission.url);
    
    await env.DB.prepare(`
      INSERT INTO links (name, url, description, icon_url)
      VALUES (?, ?, ?, ?)
    `).bind(submission.name, submission.url, submission.description, icon_url).run();
  }

  return Response.json({ success: true });
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

// 定时任务：检查链接有效性
async function checkLinks(env) {
  const links = await env.DB.prepare('SELECT * FROM links').all();
  for (const link of links.results) {
    try {
      const response = await fetch(link.url, { method: 'HEAD' });
      if (!response.ok) {
        await env.DB.prepare(`
          UPDATE links 
          SET description = description || ' (链接已失效)'
          WHERE id = ?
        `).bind(link.id).run();
      }
    } catch (err) {
      await env.DB.prepare(`
        UPDATE links 
        SET description = description || ' (链接已失效)'
        WHERE id = ?
      `).bind(link.id).run();
    }
  }
}

// 处理请求
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 处理CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json; charset=utf-8'
      },
    });
  }

  // 处理API请求
  const response = await router.handle(request);
  if (response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  }

  // 处理静态文件
  return new Response('Not Found', { 
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

// 处理定时任务
addEventListener('scheduled', event => {
  event.waitUntil(checkLinks(event.env));
}); 