import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.username,
        u.department, 
        u.role,
        (SELECT COUNT(*) FROM incidents WHERE assignee_id = u.id AND status = 'resolved') as resolved_count,
        (SELECT COUNT(*) FROM incidents WHERE assignee_id = u.id AND status = 'processing') as processing_count
      FROM users u 
      WHERE u.role = 'itstaff' OR u.role = 'admin'
      ORDER BY u.name ASC
    `);

    // Fetch details of incidents assigned to IT personnel
    const assignments = await query(`
      SELECT i.*, d.name as device_name, d.asset_code, u.name as assignee_name
      FROM incidents i
      LEFT JOIN devices d ON i.device_id = d.id
      LEFT JOIN users u ON i.assignee_id = u.id
      WHERE i.assignee_id IS NOT NULL
      ORDER BY i.reported_date DESC
      LIMIT 100
    `);

    return new Response(JSON.stringify({ 
      success: true, 
      staff: result.rows,
      assignments: assignments.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách cán bộ CNTT:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { device_id, assignee_id, title, description, priority, status, actor_id, actor_name } = data;
    
    // Insert into incidents
    const result = await query(`
      INSERT INTO incidents (device_id, title, description, priority, assignee_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [parseInt(device_id), title, description || '', priority || 'medium', parseInt(assignee_id), status || 'processing']);
    
    const newIncident = result.rows[0];
    
    // Update device status accordingly
    const devStatus = status === 'resolved' ? 'active' : status === 'processing' ? 'maintenance' : 'broken';
    await query('UPDATE devices SET status = $1 WHERE id = $2', [devStatus, parseInt(device_id)]);
    
    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actor_id || null, actor_name || 'Hệ thống', 'Phân công kỹ thuật', `Giao việc sửa chữa thiết bị ID: ${device_id} cho nhân sự ID: ${assignee_id}`]);
    
    return new Response(JSON.stringify({ success: true, assignment: newIncident }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo phân công:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, assignee_id, status, notes, title, description, priority, actor_id, actor_name } = data;
    
    // Update incident
    const result = await query(`
      UPDATE incidents SET
        assignee_id = $1,
        status = $2,
        notes = $3,
        title = $4,
        description = $5,
        priority = $6,
        resolved_date = CASE WHEN $2 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_date END
      WHERE id = $7
      RETURNING *
    `, [parseInt(assignee_id), status, notes || '', title, description || '', priority, parseInt(id)]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy phân công' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const updated = result.rows[0];
    const deviceId = updated.device_id;
    
    // Update device status accordingly
    const devStatus = status === 'resolved' ? 'active' : status === 'processing' ? 'maintenance' : 'broken';
    await query('UPDATE devices SET status = $1 WHERE id = $2', [devStatus, deviceId]);
    
    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actor_id || null, actor_name || 'Hệ thống', 'Cập nhật phân công', `Cập nhật phân công sự cố ID: ${id} sang trạng thái ${status}`]);
    
    return new Response(JSON.stringify({ success: true, assignment: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật phân công:', error);
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
    const actor_id = url.searchParams.get('actor_id');
    const actor_name = url.searchParams.get('actor_name');
    
    // Fetch original to reset device status
    const incRes = await query('SELECT device_id, title FROM incidents WHERE id = $1', [parseInt(id)]);
    if (incRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy phân công' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const inc = incRes.rows[0];
    
    // Delete the incident
    await query('DELETE FROM incidents WHERE id = $1', [parseInt(id)]);
    
    // Reset device status to active
    await query('UPDATE devices SET status = \'active\' WHERE id = $1', [inc.device_id]);
    
    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [actor_id ? parseInt(actor_id) : null, actor_name || 'Hệ thống', 'Xóa phân công', `Xóa phân công công việc: ${inc.title}`]);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi xóa phân công:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
