import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Device counts by status
    const statusCounts = await query(`
      SELECT status, count(*) as count 
      FROM devices 
      GROUP BY status
    `);
    
    // 2. Device counts by category
    const categoryCounts = await query(`
      SELECT c.name as category_name, count(d.id) as count
      FROM categories c
      LEFT JOIN devices d ON d.category_id = c.id
      GROUP BY c.name
    `);

    // 3. Financial stats: total value, total maintenance/repair cost
    const financialStats = await query(`
      SELECT 
        SUM(purchase_price) as total_value,
        (SELECT SUM(repair_cost) FROM incidents WHERE status = 'resolved') as total_repair_cost,
        (SELECT SUM(cost) FROM maintenance_plans WHERE status = 'completed') as total_maintenance_cost
      FROM devices
    `);

    // 4. Low stock consumables count
    const lowStock = await query(`
      SELECT count(*) as count 
      FROM consumables 
      WHERE current_qty <= min_qty
    `);

    // 5. Warranty & Contract warning count (expiring within 30 days)
    const expiringWarnings = await query(`
      SELECT count(*) as count 
      FROM devices 
      WHERE (warranty_end IS NOT NULL AND warranty_end <= CURRENT_DATE + INTERVAL '30 days')
         OR (contract_details ILIKE '%hạn%' AND contract_details ILIKE '%2026%')
    `);

    // 6. MTTR (Mean Time to Repair) in hours
    const mttrRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_date - reported_date))/3600) as avg_repair_hours
      FROM incidents 
      WHERE status = 'resolved' AND resolved_date IS NOT NULL
    `);
    
    const mttr = mttrRes.rows[0].avg_repair_hours 
      ? parseFloat(mttrRes.rows[0].avg_repair_hours).toFixed(1) 
      : 0;

    // 7. MTBF (Mean Time Between Failures) in days
    const mtbfRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.reported_date - d.purchase_date))/86400) as avg_uptime_days
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      WHERE d.purchase_date IS NOT NULL
    `);

    const mtbf = mtbfRes.rows[0].avg_uptime_days 
      ? parseFloat(mtbfRes.rows[0].avg_uptime_days).toFixed(1) 
      : 180;

    // 8. PM Ratio (Preventive Maintenance Ratio)
    // PM Ratio = (Completed PM Plans) / (Completed PM Plans + Resolved CM Incidents) * 100
    const pmStats = await query(`
      SELECT
        (SELECT count(*) FROM maintenance_plans WHERE status = 'completed') as completed_pm,
        (SELECT count(*) FROM incidents WHERE status = 'resolved') as resolved_cm
    `);
    const completedPm = parseInt(pmStats.rows[0].completed_pm || 0);
    const resolvedCm = parseInt(pmStats.rows[0].resolved_cm || 0);
    const pmRatio = (completedPm + resolvedCm) > 0 
      ? parseFloat((completedPm / (completedPm + resolvedCm)) * 100).toFixed(1)
      : 100; // Default to 100% if no activities yet

    // 9. Maintenance & Repair Cost Trend by Month
    const costTrendRes = await query(`
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
    `);

    // 10. Device status by department
    const deptCounts = await query(`
      SELECT location as department, count(*) as count 
      FROM devices 
      WHERE location != 'Kho thiết bị' AND location != 'Thanh lý'
      GROUP BY location
    `);

    // 11. Recent incidents
    const recentIncidents = await query(`
      SELECT i.*, d.name as device_name, d.asset_code, u.name as reporter_name
      FROM incidents i
      LEFT JOIN devices d ON i.device_id = d.id
      LEFT JOIN users u ON i.reporter_id = u.id
      ORDER BY i.reported_date DESC
      LIMIT 5
    `);

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
        costTrend: costTrendRes.rows
      },
      recentIncidents: recentIncidents.rows
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
