import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const deviceId = url.searchParams.get('device_id') || '';

    let sql = `
      SELECT i.*, d.name as device_name, d.asset_code, d.serial_number,
             r.name as reporter_name, a.name as assignee_name
      FROM incidents i
      LEFT JOIN devices d ON i.device_id = d.id
      LEFT JOIN users r ON i.reporter_id = r.id
      LEFT JOIN users a ON i.assignee_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (deviceId) {
      sql += ` AND i.device_id = $${paramIndex}`;
      params.push(parseInt(deviceId));
      paramIndex++;
    }

    sql += ' ORDER BY i.id DESC';

    const result = await query(sql, params);

    return new Response(JSON.stringify({ 
      success: true, 
      incidents: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự cố:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { device_id, title, description, priority, reporter_id, username } = data;

    // Insert incident ticket
    const result = await query(`
      INSERT INTO incidents (device_id, title, description, priority, reporter_id, status)
      VALUES ($1, $2, $3, $4, $5, 'reported')
      RETURNING *
    `, [parseInt(device_id), title, description, priority || 'medium', reporter_id ? parseInt(reporter_id) : null]);

    const newIncident = result.rows[0];

    // Update device status to 'broken'
    await query('UPDATE devices SET status = \'broken\' WHERE id = $1', [parseInt(device_id)]);

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [reporter_id || null, username || 'Hệ thống', 'Báo hỏng thiết bị', `Báo hỏng thiết bị ID: ${device_id} với sự cố: ${title}`]);

    return new Response(JSON.stringify({ success: true, incident: newIncident }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo phiếu sự cố:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { 
      id, status, assignee_id, repair_cost, notes, parts_used, 
      consumable_id, consumable_qty, user_id, username 
    } = data;

    // Fetch original incident
    const incRes = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    if (incRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy phiếu sự cố' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const incident = incRes.rows[0];
    const deviceId = incident.device_id;

    let updateSql = 'UPDATE incidents SET status = $1, assignee_id = $2';
    const params = [status, assignee_id ? parseInt(assignee_id) : null];
    let paramIndex = 3;

    if (status === 'resolved') {
      updateSql += `, resolved_date = CURRENT_TIMESTAMP, repair_cost = $${paramIndex}, parts_used = $${paramIndex + 1}, notes = $${paramIndex + 2}`;
      params.push(repair_cost ? parseFloat(repair_cost) : 0);
      params.push(parts_used || '');
      params.push(notes || '');
      paramIndex += 3;
    } else {
      updateSql += `, notes = $${paramIndex}`;
      params.push(notes || '');
      paramIndex++;
    }

    updateSql += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await query(updateSql, params);
    const updatedIncident = result.rows[0];

    // If status transitioned to processing, set device status to 'maintenance'
    if (status === 'processing') {
      await query('UPDATE devices SET status = \'maintenance\' WHERE id = $1', [deviceId]);
    }

    // If status is resolved, set device status back to 'active'
    if (status === 'resolved') {
      await query('UPDATE devices SET status = \'active\' WHERE id = $1', [deviceId]);

      // If parts/consumables were used and specified, deduct them from inventory!
      if (consumable_id && consumable_qty && parseInt(consumable_qty) > 0) {
        // Fetch consumable details to log name
        const consRes = await query('SELECT name, price FROM consumables WHERE id = $1', [parseInt(consumable_id)]);
        if (consRes.rows.length > 0) {
          const consumable = consRes.rows[0];
          const qty = parseInt(consumable_qty);

          // Deduct stock
          await query(
            'UPDATE consumables SET current_qty = current_qty - $1 WHERE id = $2',
            [qty, parseInt(consumable_id)]
          );

          // Log the export transaction
          await query(`
            INSERT INTO consumable_logs (consumable_id, type, quantity, device_id, notes)
            VALUES ($1, 'export', $2, $3, $4)
          `, [
            parseInt(consumable_id), qty, deviceId, 
            `Xuất kho sửa chữa sự cố: ${incident.title} (Giá trị linh kiện cộng dồn vào chi phí sửa chữa)`
          ]);

          // Accumulate the cost of the consumable into the repair cost
          const totalCost = parseFloat(repair_cost || 0) + (parseFloat(consumable.price) * qty);
          await query(
            'UPDATE incidents SET repair_cost = $1, parts_used = $2 WHERE id = $3',
            [totalCost, `${consumable.name} (x${qty})`, id]
          );
        }
      }
    }

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id || null, username || 'Hệ thống', 'Cập nhật sự cố', `Cập nhật trạng thái sự cố ID: ${id} sang ${status}`]);

    return new Response(JSON.stringify({ success: true, incident: updatedIncident }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật sự cố:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
