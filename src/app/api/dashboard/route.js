import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const department = url.searchParams.get('department') || '';

    // 1. Device counts by status
    let statusSql = 'SELECT status, count(*) as count FROM devices';
    const statusParams = [];
    if (department) {
      statusSql += ' WHERE location = $1';
      statusParams.push(department);
    }
    statusSql += ' GROUP BY status';
    const statusCounts = await query(statusSql, statusParams);
    
    // 2. Device counts by category
    let catSql = `
      SELECT c.name as category_name, count(d.id) as count
      FROM categories c
      LEFT JOIN devices d ON d.category_id = c.id
    `;
    const catParams = [];
    if (department) {
      catSql += ' AND d.location = $1';
      catParams.push(department);
    }
    catSql += ' GROUP BY c.name';
    const categoryCounts = await query(catSql, catParams);

    // 3. Financial stats: total value, total maintenance/repair cost
    let finSql = '';
    const finParams = [];
    if (department) {
      finSql = `
        SELECT 
          SUM(purchase_price) as total_value,
          (SELECT SUM(repair_cost) FROM incidents i JOIN devices d ON i.device_id = d.id WHERE i.status = 'resolved' AND d.location = $1) as total_repair_cost,
          (SELECT SUM(cost) FROM maintenance_plans m JOIN devices d ON m.device_id = d.id WHERE m.status = 'completed' AND d.location = $1) as total_maintenance_cost
        FROM devices
        WHERE location = $1
      `;
      finParams.push(department);
    } else {
      finSql = `
        SELECT 
          SUM(purchase_price) as total_value,
          (SELECT SUM(repair_cost) FROM incidents WHERE status = 'resolved') as total_repair_cost,
          (SELECT SUM(cost) FROM maintenance_plans WHERE status = 'completed') as total_maintenance_cost
        FROM devices
      `;
    }
    const financialStats = await query(finSql, finParams);

    // 4. Low stock consumables count
    const lowStock = await query(`
      SELECT count(*) as count 
      FROM consumables 
      WHERE current_qty <= min_qty
    `);

    // 5. Warranty & Contract warning count (expiring within 30 days)
    let expSql = `
      SELECT count(*) as count 
      FROM devices 
      WHERE ((warranty_end IS NOT NULL AND warranty_end <= CURRENT_DATE + INTERVAL '30 days')
         OR (contract_details ILIKE '%hạn%' AND contract_details ILIKE '%2026%'))
    `;
    const expParams = [];
    if (department) {
      expSql += ' AND location = $1';
      expParams.push(department);
    }
    const expiringWarnings = await query(expSql, expParams);

    // 6. MTTR (Mean Time to Repair) in hours
    let mttrSql = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.resolved_date - i.reported_date))/3600) as avg_repair_hours
      FROM incidents i
    `;
    const mttrParams = [];
    if (department) {
      mttrSql += ' JOIN devices d ON i.device_id = d.id WHERE d.location = $1 AND i.status = \'resolved\' AND i.resolved_date IS NOT NULL';
      mttrParams.push(department);
    } else {
      mttrSql += ' WHERE i.status = \'resolved\' AND i.resolved_date IS NOT NULL';
    }
    const mttrRes = await query(mttrSql, mttrParams);
    
    const mttr = mttrRes.rows[0].avg_repair_hours 
      ? parseFloat(mttrRes.rows[0].avg_repair_hours).toFixed(1) 
      : 0;

    // 7. MTBF (Mean Time Between Failures) in days
    let mtbfSql = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.reported_date - d.purchase_date))/86400) as avg_uptime_days
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      WHERE d.purchase_date IS NOT NULL
    `;
    const mtbfParams = [];
    if (department) {
      mtbfSql += ' AND d.location = $1';
      mtbfParams.push(department);
    }
    const mtbfRes = await query(mtbfSql, mtbfParams);

    const mtbf = mtbfRes.rows[0].avg_uptime_days 
      ? parseFloat(mtbfRes.rows[0].avg_uptime_days).toFixed(1) 
      : 180;

    // 8. PM Ratio (Preventive Maintenance Ratio)
    let pmSql = '';
    const pmParams = [];
    if (department) {
      pmSql = `
        SELECT
          (SELECT count(*) FROM maintenance_plans m JOIN devices d ON m.device_id = d.id WHERE m.status = 'completed' AND d.location = $1) as completed_pm,
          (SELECT count(*) FROM incidents i JOIN devices d ON i.device_id = d.id WHERE i.status = 'resolved' AND d.location = $1) as resolved_cm
      `;
      pmParams.push(department);
    } else {
      pmSql = `
        SELECT
          (SELECT count(*) FROM maintenance_plans WHERE status = 'completed') as completed_pm,
          (SELECT count(*) FROM incidents WHERE status = 'resolved') as resolved_cm
      `;
    }
    const pmStats = await query(pmSql, pmParams);
    const completedPm = parseInt(pmStats.rows[0].completed_pm || 0);
    const resolvedCm = parseInt(pmStats.rows[0].resolved_cm || 0);
    const pmRatio = (completedPm + resolvedCm) > 0 
      ? parseFloat((completedPm / (completedPm + resolvedCm)) * 100).toFixed(1)
      : 100;

    // 9. Maintenance & Repair Cost Trend by Month
    let trendSql = '';
    const trendParams = [];
    if (department) {
      trendSql = `
        SELECT month, SUM(cost) as total_cost
        FROM (
          SELECT to_char(m.completed_date, 'YYYY-MM') as month, SUM(m.cost) as cost 
          FROM maintenance_plans m
          JOIN devices d ON m.device_id = d.id
          WHERE m.status = 'completed' AND m.completed_date IS NOT NULL AND d.location = $1
          GROUP BY month
          UNION ALL
          SELECT to_char(i.resolved_date, 'YYYY-MM') as month, SUM(i.repair_cost) as cost 
          FROM incidents i
          JOIN devices d ON i.device_id = d.id
          WHERE i.status = 'resolved' AND i.resolved_date IS NOT NULL AND d.location = $1
          GROUP BY month
        ) combined
        GROUP BY month
        ORDER BY month ASC
        LIMIT 6
      `;
      trendParams.push(department);
    } else {
      trendSql = `
        SELECT month, SUM(cost) as total_cost
        FROM (
          SELECT to_char(completed_date, 'YYYY-MM') as month, SUM(cost) as cost 
          FROM maintenance_plans 
          WHERE status = 'completed' AND completed_date IS NOT NULL
          GROUP BY month
          UNION ALL
          SELECT to_char(resolved_date, 'YYYY-MM') as month, SUM(repair_cost) as cost 
          FROM incidents 
          WHERE status = 'resolved' AND resolved_date IS NOT NULL
          GROUP BY month
        ) combined
        GROUP BY month
        ORDER BY month ASC
        LIMIT 6
      `;
    }
    const costTrendRes = await query(trendSql, trendParams);

    // 10. Device status by department
    let deptSql = `
      SELECT location as department, count(*) as count 
      FROM devices 
      WHERE location != 'Kho thiết bị' AND location != 'Thanh lý'
    `;
    const deptParams = [];
    if (department) {
      deptSql += ' AND location = $1';
      deptParams.push(department);
    }
    deptSql += ' GROUP BY location';
    const deptCounts = await query(deptSql, deptParams);

    // 11. Recent incidents
    let incSql = `
      SELECT i.*, d.name as device_name, d.asset_code, u.name as reporter_name
      FROM incidents i
      LEFT JOIN devices d ON i.device_id = d.id
      LEFT JOIN users u ON i.reporter_id = u.id
    `;
    const incParams = [];
    if (department) {
      incSql += ' WHERE d.location = $1';
      incParams.push(department);
    }
    incSql += ' ORDER BY i.reported_date DESC LIMIT 5';
    const recentIncidents = await query(incSql, incParams);

    // 12. Active Support Requests Count
    let supportActiveSql = `
      SELECT COUNT(*) as count 
      FROM support_requests 
      WHERE status IN ('submitted', 'approved', 'processing')
    `;
    const supportActiveParams = [];
    if (department) {
      supportActiveSql += ' AND department = $1';
      supportActiveParams.push(department);
    }
    const supportActiveCount = await query(supportActiveSql, supportActiveParams);

    // 13. Recent support requests
    let supportRecentSql = `
      SELECT sr.*, d.name as device_name, d.asset_code, u.name as requester_name
      FROM support_requests sr
      LEFT JOIN devices d ON sr.device_id = d.id
      LEFT JOIN users u ON sr.requester_id = u.id
    `;
    const supportRecentParams = [];
    if (department) {
      supportRecentSql += ' WHERE sr.department = $1';
      supportRecentParams.push(department);
    }
    supportRecentSql += ' ORDER BY sr.created_at DESC LIMIT 5';
    const recentRequests = await query(supportRecentSql, supportRecentParams);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        statusCounts: statusCounts.rows,
        categoryCounts: categoryCounts.rows,
        deptCounts: deptCounts.rows,
        totalValue: financialStats.rows[0]?.total_value || 0,
        totalRepairCost: financialStats.rows[0]?.total_repair_cost || 0,
        totalMaintenanceCost: financialStats.rows[0]?.total_maintenance_cost || 0,
        lowStockCount: parseInt(lowStock.rows[0]?.count || 0),
        expiringWarningsCount: parseInt(expiringWarnings.rows[0]?.count || 0),
        mttrHours: mttr,
        mtbfDays: mtbf,
        pmRatio: pmRatio,
        costTrend: costTrendRes.rows,
        supportActiveCount: parseInt(supportActiveCount.rows[0]?.count || 0)
      },
      recentIncidents: recentIncidents.rows,
      recentRequests: recentRequests.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi lấy chỉ số Dashboard:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
