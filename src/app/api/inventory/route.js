import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const consumables = await query('SELECT * FROM consumables ORDER BY name ASC');
    const logs = await query(`
      SELECT cl.*, c.name as consumable_name, d.name as device_name, d.asset_code 
      FROM consumable_logs cl
      LEFT JOIN consumables c ON cl.consumable_id = c.id
      LEFT JOIN devices d ON cl.device_id = d.id
      ORDER BY cl.action_date DESC
      LIMIT 100
    `);

    return new Response(JSON.stringify({ 
      success: true, 
      consumables: consumables.rows,
      logs: logs.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách vật tư:', error);
    return new Response(JSON.stringify({ success: false, message: error.message, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { 
      id, name, type, quantity, min_qty, unit, price, user_id, username, action_type // 'create' or 'import'
    } = data;

    if (action_type === 'create') {
      const result = await query(`
        INSERT INTO consumables (name, type, current_qty, min_qty, unit, price)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, type, parseInt(quantity) || 0, parseInt(min_qty) || 5, unit || 'Cái', parseFloat(price) || 0]);

      const newItem = result.rows[0];

      // If initial quantity is greater than 0, create an import log
      if (parseInt(quantity) > 0) {
        await query(`
          INSERT INTO consumable_logs (consumable_id, type, quantity, notes)
          VALUES ($1, 'import', $2, 'Nhập kho ban đầu khi tạo danh mục')
        `, [newItem.id, parseInt(quantity)]);
      }

      // Audit log
      await query(`
        INSERT INTO audit_logs (user_id, username, action, details)
        VALUES ($1, $2, $3, $4)
      `, [user_id || null, username || 'Hệ thống', 'Tạo vật tư mới', `Khởi tạo vật tư "${name}" trong kho`]);

      return new Response(JSON.stringify({ success: true, item: newItem }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action_type === 'import') {
      // Import existing consumable
      const qty = parseInt(quantity);
      
      const result = await query(`
        UPDATE consumables 
        SET current_qty = current_qty + $1, price = $2
        WHERE id = $3
        RETURNING *
      `, [qty, parseFloat(price), parseInt(id)]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy vật tư' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updatedItem = result.rows[0];

      // Add consumable log
      await query(`
        INSERT INTO consumable_logs (consumable_id, type, quantity, notes)
        VALUES ($1, 'import', $2, 'Nhập bổ sung kho')
      `, [parseInt(id), qty]);

      // Audit log
      await query(`
        INSERT INTO audit_logs (user_id, username, action, details)
        VALUES ($1, $2, $3, $4)
      `, [user_id || null, username || 'Hệ thống', 'Nhập thêm vật tư', `Nhập thêm số lượng ${qty} cho vật tư "${updatedItem.name}"`]);

      return new Response(JSON.stringify({ success: true, item: updatedItem }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (action_type === 'export') {
      const qty = parseInt(quantity);
      const { department, notes: exportNotes } = data;

      // Check current quantity first
      const itemRes = await query('SELECT name, current_qty FROM consumables WHERE id = $1', [parseInt(id)]);
      if (itemRes.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy vật tư' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const item = itemRes.rows[0];
      if (item.current_qty < qty) {
        return new Response(JSON.stringify({ success: false, message: `Số lượng tồn kho không đủ (Hiện tại: ${item.current_qty})` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Deduct stock
      const result = await query(`
        UPDATE consumables 
        SET current_qty = current_qty - $1
        WHERE id = $2
        RETURNING *
      `, [qty, parseInt(id)]);

      const updatedItem = result.rows[0];

      // Add consumable log
      const notesString = `Xuất cấp phát về Khoa/Phòng: ${department}. ${exportNotes || ''}`;
      await query(`
        INSERT INTO consumable_logs (consumable_id, type, quantity, notes)
        VALUES ($1, 'export', $2, $3)
      `, [parseInt(id), qty, notesString]);

      // Audit log
      await query(`
        INSERT INTO audit_logs (user_id, username, action, details)
        VALUES ($1, $2, $3, $4)
      `, [user_id || null, username || 'Hệ thống', 'Xuất vật tư', `Xuất cấp phát ${qty} ${updatedItem.unit} "${updatedItem.name}" cho ${department}`]);

      return new Response(JSON.stringify({ success: true, item: updatedItem }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Hành động không hợp lệ' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi quản lý kho vật tư:', error);
    return new Response(JSON.stringify({ success: false, message: error.message, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
