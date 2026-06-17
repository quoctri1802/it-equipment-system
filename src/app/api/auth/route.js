import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    // In production, use bcrypt/argon2 to verify password_hash
    // Since this is a specialized management app, we match plaintext password for simple setup
    const result = await query(
      'SELECT id, username, role, name, department FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Write an audit log entry
      await query(
        'INSERT INTO audit_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
        [user.id, user.username, 'Đăng nhập', `Người dùng ${user.name} đăng nhập thành công`]
      );

      return new Response(JSON.stringify({ 
        success: true, 
        user 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
