import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const result = await query('SELECT id, username, role, name, department FROM users ORDER BY name ASC');
    return new Response(JSON.stringify({ 
      success: true, 
      users: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { username, password, role, name, department, actor_id, actor_name } = data;

    const result = await query(`
      INSERT INTO users (username, password, role, name, department)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, role, name, department
    `, [username, password, role, name, department]);

    const newUser = result.rows[0];

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actor_id || null, actor_name || 'Hệ thống', 'Thêm người dùng', `Thêm mới tài khoản: ${username} (${name})`]);

    return new Response(JSON.stringify({ success: true, user: newUser }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo người dùng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, username, password, role, name, department, actor_id, actor_name } = data;

    let result;
    if (password) {
      // If updating password
      result = await query(`
        UPDATE users SET
          username = $1, password = $2, role = $3, name = $4, department = $5
        WHERE id = $6
        RETURNING id, username, role, name, department
      `, [username, password, role, name, department, id]);
    } else {
      // Without updating password
      result = await query(`
        UPDATE users SET
          username = $1, role = $2, name = $3, department = $4
        WHERE id = $5
        RETURNING id, username, role, name, department
      `, [username, role, name, department, id]);
    }

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy người dùng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedUser = result.rows[0];

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actor_id || null, actor_name || 'Hệ thống', 'Sửa người dùng', `Cập nhật thông tin tài khoản: ${username}`]);

    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật người dùng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const actorId = url.searchParams.get('actor_id');
    const actorName = url.searchParams.get('actor_name');

    // Fetch user details first for logging
    const userRes = await query('SELECT username FROM users WHERE id = $1', [parseInt(id)]);
    if (userRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy người dùng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const targetUsername = userRes.rows[0].username;

    await query('DELETE FROM users WHERE id = $1', [parseInt(id)]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actorId ? parseInt(actorId) : null, actorName || 'Hệ thống', 'Xóa người dùng', `Xóa tài khoản: ${targetUsername}`]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi xóa người dùng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
