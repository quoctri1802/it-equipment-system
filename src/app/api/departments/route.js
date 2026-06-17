import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const result = await query(`
      SELECT dept.*, COALESCE(dev.device_count, 0) as device_count
      FROM departments dept
      LEFT JOIN (
        SELECT location, COUNT(*) as device_count
        FROM devices
        GROUP BY location
      ) dev ON dept.name = dev.location
      ORDER BY dept.name ASC
    `);
    return new Response(JSON.stringify({ success: true, departments: result.rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách khoa/phòng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, description, user_id, username } = data;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Tên khoa/phòng không được để trống' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const check = await query('SELECT id FROM departments WHERE name = $1', [name.trim()]);
    if (check.rows.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'Tên khoa/phòng này đã tồn tại trong hệ thống' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description || '']
    );

    // Write audit log
    await query(
      'INSERT INTO audit_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [user_id || null, username || 'Hệ thống', 'Tạo khoa phòng', `Tạo mới khoa/phòng: ${name}`]
    );

    return new Response(JSON.stringify({ success: true, department: result.rows[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo khoa/phòng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, name, description, user_id, username } = data;

    if (!id || !name || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu thông tin cập nhật' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch original department details to see if name changed
    const origRes = await query('SELECT * FROM departments WHERE id = $1', [id]);
    if (origRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy khoa/phòng cần sửa' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const oldDept = origRes.rows[0];
    const newName = name.trim();

    // Check if new name conflicts with another department
    if (oldDept.name !== newName) {
      const check = await query('SELECT id FROM departments WHERE name = $1 AND id != $2', [newName, id]);
      if (check.rows.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'Tên khoa/phòng mới này đã bị trùng' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const result = await query(
      'UPDATE departments SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [newName, description || '', id]
    );

    // If name changed, update cascaded references in users and devices tables!
    if (oldDept.name !== newName) {
      // Update users
      await query('UPDATE users SET department = $1 WHERE department = $2', [newName, oldDept.name]);
      // Update devices location
      await query('UPDATE devices SET location = $1 WHERE location = $2', [newName, oldDept.name]);
      // Update support requests department
      await query('UPDATE support_requests SET department = $1 WHERE department = $2', [newName, oldDept.name]);
    }

    // Write audit log
    await query(
      'INSERT INTO audit_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [user_id || null, username || 'Hệ thống', 'Sửa khoa phòng', `Sửa thông tin khoa/phòng: ${oldDept.name} thành ${newName}`]
    );

    return new Response(JSON.stringify({ success: true, department: result.rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật khoa/phòng:', error);
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
    const actorName = url.searchParams.get('actor_name') || 'Hệ thống';

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu ID khoa/phòng cần xóa' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const origRes = await query('SELECT * FROM departments WHERE id = $1', [parseInt(id)]);
    if (origRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy khoa/phòng cần xóa' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const oldDept = origRes.rows[0];

    // Delete department
    await query('DELETE FROM departments WHERE id = $1', [parseInt(id)]);

    // Cascade: Reset location for devices and users in this department
    await query("UPDATE devices SET location = 'Kho thiết bị' WHERE location = $1", [oldDept.name]);
    await query("UPDATE users SET department = 'Chưa phân bổ' WHERE department = $1", [oldDept.name]);
    await query("UPDATE support_requests SET department = 'Chưa phân bổ' WHERE department = $1", [oldDept.name]);

    // Write audit log
    await query(
      'INSERT INTO audit_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [actorId ? parseInt(actorId) : null, actorName, 'Xóa khoa phòng', `Xóa khoa/phòng: ${oldDept.name}`]
    );

    return new Response(JSON.stringify({ success: true, message: 'Xóa khoa/phòng thành công' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi xóa khoa/phòng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
