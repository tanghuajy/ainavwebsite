import { SignJWT } from 'jose';
import { compare } from 'bcryptjs';

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
    console.log("登录尝试:", email);
    console.log("输入的密码:", password);
    
    const user = await context.env.bookmark_db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();

    if (!user) {
      console.log("用户不存在:", email);
      return new Response(
        JSON.stringify({ error: '用户不存在' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    console.log("找到用户:", user);
    console.log("数据库中的密码哈希:", user.password_hash);
    
    const valid = await compare(password, user.password_hash);
    console.log("密码验证结果:", valid);
    
    if (!valid) {
      console.log("密码错误:", email);
      return new Response(
        JSON.stringify({ error: '密码错误' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      isAdmin: user.is_admin 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(context.env.JWT_SECRET));

    console.log("登录成功，生成的token:", token);
    
    return new Response(
      JSON.stringify({ token }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error("登录错误:", error);
    return new Response(
      JSON.stringify({ error: '登录处理错误: ' + error.message }), 
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