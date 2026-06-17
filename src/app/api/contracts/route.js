import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const result = await query('SELECT * FROM contracts ORDER BY id DESC');
    return new Response(JSON.stringify({ 
      success: true, 
      contracts: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách hợp đồng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { contract_number, supplier, service, value, start_date, end_date, contact, user_id, username } = data;

    const result = await query(`
      INSERT INTO contracts (contract_number, supplier, service, value, start_date, end_date, contact)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [contract_number, supplier, service, value ? parseFloat(value) : 0, start_date, end_date, contact]);

    const newContract = result.rows[0];

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id || null, username || 'Hệ thống', 'Thêm hợp đồng', `Thêm mới hợp đồng: ${contract_number} với ${supplier}`]);

    return new Response(JSON.stringify({ success: true, contract: newContract }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo hợp đồng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, contract_number, supplier, service, value, start_date, end_date, contact, user_id, username } = data;

    const result = await query(`
      UPDATE contracts SET
        contract_number = $1, supplier = $2, service = $3, value = $4, start_date = $5, end_date = $6, contact = $7
      WHERE id = $8
      RETURNING *
    `, [contract_number, supplier, service, value ? parseFloat(value) : 0, start_date, end_date, contact, id]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedContract = result.rows[0];

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id || null, username || 'Hệ thống', 'Sửa hợp đồng', `Cập nhật thông tin hợp đồng số: ${contract_number}`]);

    return new Response(JSON.stringify({ success: true, contract: updatedContract }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật hợp đồng:', error);
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
    const user_id = url.searchParams.get('user_id');
    const username = url.searchParams.get('username');

    // Fetch details first for logging
    const contractRes = await query('SELECT contract_number, supplier FROM contracts WHERE id = $1', [parseInt(id)]);
    if (contractRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const contract = contractRes.rows[0];

    await query('DELETE FROM contracts WHERE id = $1', [parseInt(id)]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [user_id ? parseInt(user_id) : null, username || 'Hệ thống', 'Xóa hợp đồng', `Xóa hợp đồng số: ${contract.contract_number} của ${contract.supplier}`]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi xóa hợp đồng:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
