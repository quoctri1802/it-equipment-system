import { query } from '@/lib/db';

function getNextPlannedDate(currentDateStr, recurrence) {
  const date = new Date(currentDateStr);
  if (isNaN(date.getTime())) return null;
  
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split('T')[0];
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const deviceId = url.searchParams.get('device_id') || '';

    let sql = `
      SELECT mp.*, d.name as device_name, d.asset_code, u.name as performed_by_name,
             c.contract_number, c.supplier as contract_supplier
      FROM maintenance_plans mp
      LEFT JOIN devices d ON mp.device_id = d.id
      LEFT JOIN users u ON mp.performed_by = u.id
      LEFT JOIN contracts c ON mp.contract_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND mp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (deviceId) {
      sql += ` AND mp.device_id = $${paramIndex}`;
      params.push(parseInt(deviceId));
      paramIndex++;
    }

    sql += ' ORDER BY mp.planned_date ASC';

    const result = await query(sql, params);

    return new Response(JSON.stringify({ 
      success: true, 
      plans: result.rows 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách bảo trì:', error);
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
      device_id, title, planned_date, recurrence, checklist, contract_id, 
      user_id, username 
    } = data;

    const result = await query(`
      INSERT INTO maintenance_plans (device_id, title, planned_date, recurrence, checklist, contract_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'planned')
      RETURNING *
    `, [
      parseInt(device_id), 
      title, 
      planned_date, 
      recurrence || 'none', 
      checklist ? (typeof checklist === 'string' ? checklist : JSON.stringify(checklist)) : '[]', 
      contract_id ? parseInt(contract_id) : null
    ]);

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [
      user_id || null, 
      username || 'Hệ thống', 
      'Lập lịch bảo trì', 
      `Lập lịch bảo trì định kỳ "${title}" (chu kỳ: ${recurrence || 'none'}) ngày ${planned_date} cho thiết bị ID ${device_id}`
    ]);

    return new Response(JSON.stringify({ success: true, plan: result.rows[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi tạo lịch bảo trì:', error);
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
      id, status, completed_date, cost, performed_by, notes, 
      consumable_id, consumable_qty, user_id, username 
    } = data;

    // Fetch original plan details
    const originalPlanRes = await query('SELECT * FROM maintenance_plans WHERE id = $1', [id]);
    if (originalPlanRes.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy kế hoạch bảo trì' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const originalPlan = originalPlanRes.rows[0];
    const deviceId = originalPlan.device_id;

    let finalCost = cost ? parseFloat(cost) : 0;
    let finalPartsUsed = originalPlan.parts_used || '';

    // If status is completed and consumables were selected, deduct them!
    if (status === 'completed' && consumable_id && consumable_qty && parseInt(consumable_qty) > 0) {
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
          `Xuất kho phục vụ bảo trì thiết bị: ${originalPlan.title}`
        ]);

        // Accumulate parts cost
        finalCost += (parseFloat(consumable.price) * qty);
        finalPartsUsed = `${consumable.name} (x${qty})`;
      }
    }

    const result = await query(`
      UPDATE maintenance_plans SET
        status = $1,
        completed_date = $2,
        cost = $3,
        performed_by = $4,
        notes = $5,
        parts_used = $6
      WHERE id = $7
      RETURNING *
    `, [
      status, 
      completed_date || null, 
      finalCost, 
      performed_by ? parseInt(performed_by) : null,
      notes || '',
      finalPartsUsed,
      id
    ]);

    const plan = result.rows[0];

    // If status transitioned to completed, update device status back to active
    if (status === 'completed') {
      await query('UPDATE devices SET status = \'active\' WHERE id = $1', [deviceId]);

      // CMMS Core: Auto-generate the next planned occurrence if recurrence is enabled
      if (plan.recurrence && plan.recurrence !== 'none') {
        const nextPlannedDate = getNextPlannedDate(plan.planned_date, plan.recurrence);
        if (nextPlannedDate) {
          // Re-serialize checklist from the plan
          const originalChecklist = plan.checklist;
          
          await query(`
            INSERT INTO maintenance_plans (device_id, title, planned_date, recurrence, checklist, contract_id, parent_plan_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned')
          `, [
            plan.device_id,
            plan.title,
            nextPlannedDate,
            plan.recurrence,
            typeof originalChecklist === 'string' ? originalChecklist : JSON.stringify(originalChecklist),
            plan.contract_id,
            plan.parent_plan_id || plan.id
          ]);
        }
      }
    }

    // Write audit log
    await query(`
      INSERT INTO audit_logs (user_id, username, action, details)
      VALUES ($1, $2, $3, $4)
    `, [
      user_id || null, 
      username || 'Hệ thống', 
      'Cập nhật bảo trì', 
      `Cập nhật bảo trì "${plan.title}" (Trạng thái: ${status}) cho thiết bị ID ${plan.device_id}`
    ]);

    return new Response(JSON.stringify({ success: true, plan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi cập nhật bảo trì:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
