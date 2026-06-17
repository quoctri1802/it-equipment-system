import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const location = url.searchParams.get('location') || '';

    let sql = `
      SELECT d.*, c.name as category_name 
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (d.name ILIKE $${paramIndex} OR d.asset_code ILIKE $${paramIndex} OR d.serial_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      sql += ` AND d.category_id = $${paramIndex}`;
      params.push(parseInt(category));
      paramIndex++;
    }

    if (status) {
      sql += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (location) {
      sql += ` AND d.location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }

    sql += ' ORDER BY d.id DESC';

    const result = await query(sql, params);
    
    // Also fetch categories list to make it easier for UI
    const categories = await query('SELECT * FROM categories ORDER BY name');

    return new Response(JSON.stringify({ 
      success: true, 
      devices: result.rows,
      categories: categories.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thiết bị:', error);
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
      asset_code, name, category_id, model, manufacturer, serial_number, 
      specifications, location, status, purchase_date, purchase_price, 
      funding_source, supplier, warranty_months, warranty_start, warranty_end,
      contract_details, qr_code, user_id, username
    } = data;

    const result = await query(`
      INSERT INTO devices (
        asset_code, name, category_id, model, manufacturer, serial_number, 
        specifications, location, status, purchase_date, purchase_price, 
        funding_source, supplier, warranty_months, warranty_start, warranty_end,
        contract_details, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      asset_code, name, category_id ? parseInt(category_id) : null, model, manufacturer, serial_number,
      JSON.stringify(specifications || {}), location || 'Kho thiết bị', status || 'in_stock',
      purchase_date || null, purchase_price || 0, funding_source, supplier,
      warranty_months || 12, warranty_start || null, warranty_end || null,
      contract_details, qr_code
    ]);

    const newDevice = result.rows[0];

    // Log allocation if initial location is not 'Kho thiết bị'
    await query(`
      INSERT INTO allocation_logs (device_id, type, from_dept, to_dept, user_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [newDevice.id, 'import', 'Nhập mới', newDevice.location, user_id || null, 'Nhập thiết bị mới vào hệ thống']);

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id || null, username || 'Hệ thống', 'Nhập thiết bị', `Nhập mới thiết bị ${name} (Mã: ${asset_code})`]);

    return new Response(JSON.stringify({ success: true, device: newDevice }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi nhập thiết bị:', error);
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
      id, asset_code, name, category_id, model, manufacturer, serial_number, 
      specifications, location, status, purchase_date, purchase_price, 
      funding_source, supplier, warranty_months, warranty_start, warranty_end,
      contract_details, qr_code, user_id, username, action_type // e.g., 'liquidate', 'update'
    } = data;

    // Fetch old data to check changes
    const oldRes = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy thiết bị' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const oldDevice = oldRes.rows[0];

    const result = await query(`
      UPDATE devices SET
        asset_code = $1, name = $2, category_id = $3, model = $4, manufacturer = $5, 
        serial_number = $6, specifications = $7, location = $8, status = $9, 
        purchase_date = $10, purchase_price = $11, funding_source = $12, supplier = $13, 
        warranty_months = $14, warranty_start = $15, warranty_end = $16, 
        contract_details = $17, qr_code = $18, updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *
    `, [
      asset_code, name, category_id ? parseInt(category_id) : null, model, manufacturer, serial_number,
      JSON.stringify(specifications || {}), location, status,
      purchase_date || null, purchase_price || 0, funding_source, supplier,
      warranty_months || 12, warranty_start || null, warranty_end || null,
      contract_details, qr_code, id
    ]);

    const updatedDevice = result.rows[0];

    // If location changed, write allocation log
    if (oldDevice.location !== location) {
      await query(`
        INSERT INTO allocation_logs (device_id, type, from_dept, to_dept, user_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, action_type === 'liquidate' ? 'liquidate' : 'transfer', oldDevice.location, location, user_id || null, `Điều chuyển vị trí từ ${oldDevice.location} sang ${location}`]);
    }

    // Write audit log
    let auditAction = 'Cập nhật thiết bị';
    if (action_type === 'liquidate') auditAction = 'Thanh lý thiết bị';
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id || null, username || 'Hệ thống', auditAction, `${auditAction} ${name} (Mã: ${asset_code})`]);

    return new Response(JSON.stringify({ success: true, device: updatedDevice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật thiết bị:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
