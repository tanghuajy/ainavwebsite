import { hash } from 'bcryptjs';

export async function onRequest(context) {
  // 处理CORS预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 只接受POST请求
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { email, password } = await context.request.json();
    console.log("注册尝试:", email);
    
    // 检查邮箱是否已存在
    const existingUser = await context.env.bookmark_db.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();

    if (existingUser) {
      console.log("邮箱已存在:", email);
      return new Response(
        JSON.stringify({ error: '该邮箱已被注册' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 对密码进行哈希处理
    const password_hash = await hash(password, 10);
    console.log("密码哈希完成");

    // 创建新用户
    const result = await context.env.bookmark_db.prepare(`
      INSERT INTO users (email, password_hash, is_admin, created_at, updated_at) 
      VALUES (?, ?, 0, datetime('now'), datetime('now'))
    `).bind(email, password_hash).run();

    console.log("用户创建成功:", email);
    
    return new Response(
      JSON.stringify({ message: '注册成功' }), 
      { 
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error("注册错误:", error);
    return new Response(
      JSON.stringify({ error: '注册处理错误: ' + error.message }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
} 