import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('device_id');

    let sql = `
      SELECT al.*, d.name as device_name, d.asset_code, u.name as user_name 
      FROM allocation_logs al
      LEFT JOIN devices d ON al.device_id = d.id
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params = [];
    
    if (deviceId) {
      sql += ' WHERE al.device_id = $1';
      params.push(parseInt(deviceId));
    }
    
    sql += ' ORDER BY al.action_date DESC';

    const result = await query(sql, params);

    return new Response(JSON.stringify({ 
      success: true, 
      logs: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử điều chuyển:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
