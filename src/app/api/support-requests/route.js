import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const department = url.searchParams.get('department') || '';
    const requesterId = url.searchParams.get('requester_id') || '';
    const status = url.searchParams.get('status') || '';
    const requestType = url.searchParams.get('request_type') || '';

    let sql = `
      SELECT sr.*, d.name as device_name, d.asset_code, d.serial_number, d.location as device_location,
             req.name as requester_name, ass.name as assignee_name
      FROM support_requests sr
      LEFT JOIN devices d ON sr.device_id = d.id
      LEFT JOIN users req ON sr.requester_id = req.id
      LEFT JOIN users ass ON sr.assigned_to = ass.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (department) {
      sql += ` AND sr.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (requesterId) {
      sql += ` AND sr.requester_id = $${paramIndex}`;
      params.push(parseInt(requesterId));
      paramIndex++;
    }

    if (status) {
      sql += ` AND sr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (requestType) {
      sql += ` AND sr.request_type = $${paramIndex}`;
      params.push(requestType);
      paramIndex++;
    }

    sql += ' ORDER BY sr.id DESC';

    const result = await query(sql, params);

    return new Response(JSON.stringify({ 
      success: true, 
      requests: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách yêu cầu hỗ trợ:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { 
      device_id, request_type, title, description, priority, 
      requester_id, target_date, department, username 
    } = data;

    // Validate request_type
    const validTypes = ['repair', 'upgrade', 'borrow'];
    if (!validTypes.includes(request_type)) {
      return new Response(JSON.stringify({ success: false, error: 'Loại yêu cầu không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert support request ticket
    const result = await query(`
      INSERT INTO support_requests (
        device_id, request_type, title, description, priority, 
        requester_id, target_date, department, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted')
      RETURNING *
    `, [
      device_id ? parseInt(device_id) : null,
      request_type,
      title,
      description,
      priority || 'medium',
      requester_id ? parseInt(requester_id) : null,
      target_date || null,
      department || null
    ]);

    const newRequest = result.rows[0];

    // If type is repair, and device is attached, set device status to 'broken'
    if (request_type === 'repair' && device_id) {
      await query("UPDATE devices SET status = 'broken' WHERE id = $1", [parseInt(device_id)]);
    }

    // Write audit log
    let requestTypeText = request_type === 'repair' ? 'Sửa chữa' : request_type === 'upgrade' ? 'Nâng cấp' : 'Mượn thiết bị';
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [
      requester_id || null, 
      username || 'Hệ thống', 
      `Yêu cầu tự phục vụ: ${requestTypeText}`, 
      `Tạo yêu cầu ${requestTypeText} mới: "${title}" cho khoa/phòng: ${department}`
    ]);

    return new Response(JSON.stringify({ success: true, request: newRequest }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo yêu cầu hỗ trợ:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, assigned_to, notes, user_id, username } = data;

    // Fetch original request
    const reqRes = await query('SELECT * FROM support_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy yêu cầu hỗ trợ' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const oldRequest = reqRes.rows[0];
    const deviceId = oldRequest.device_id;
    const requestType = oldRequest.request_type;

    // Update support request
    const result = await query(`
      UPDATE support_requests 
      SET status = $1, assigned_to = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [
      status, 
      assigned_to ? parseInt(assigned_to) : null, 
      notes || '', 
      id
    ]);
    const updatedRequest = result.rows[0];

    // If type is repair, and device is attached, keep device status synchronized
    if (deviceId && requestType === 'repair') {
      if (status === 'processing') {
        await query("UPDATE devices SET status = 'maintenance' WHERE id = $1", [deviceId]);
      } else if (status === 'completed') {
        await query("UPDATE devices SET status = 'active' WHERE id = $1", [deviceId]);
      }
    }

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [
      user_id || null, 
      username || 'Hệ thống', 
      'Cập nhật yêu cầu tự phục vụ', 
      `Cập nhật trạng thái yêu cầu ID: ${id} sang "${status}". Ghi chú: ${notes || 'Không có'}`
    ]);

    return new Response(JSON.stringify({ success: true, request: updatedRequest }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật yêu cầu hỗ trợ:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
