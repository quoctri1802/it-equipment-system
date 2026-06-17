import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. General Device Statistics
    const deviceStats = await query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(COALESCE(purchase_price, 0)) as total_value,
        COUNT(CASE WHEN status = 'broken' THEN 1 END) as broken_count,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'in_stock' THEN 1 END) as instock_count,
        COUNT(CASE WHEN status = 'waiting_liquidation' THEN 1 END) as liquidation_pending_count,
        COUNT(CASE WHEN status = 'liquidated' THEN 1 END) as liquidated_count
      FROM devices
    `);

    // 2. Breakdown by Category
    const categoryBreakdown = await query(`
      SELECT 
        c.name as category_name, 
        COUNT(d.id) as count,
        SUM(COALESCE(d.purchase_price, 0)) as total_value
      FROM categories c
      LEFT JOIN devices d ON d.category_id = c.id
      GROUP BY c.name
      ORDER BY count DESC
    `);

    // 3. Breakdown by Department / Location
    const deptBreakdown = await query(`
      SELECT 
        COALESCE(location, 'Chưa xác định') as department, 
        COUNT(*) as count,
        SUM(COALESCE(purchase_price, 0)) as total_value
      FROM devices
      WHERE status != 'liquidated'
      GROUP BY location
      ORDER BY count DESC
    `);

    // 4. Breakdown by Funding Source
    const fundingBreakdown = await query(`
      SELECT 
        COALESCE(funding_source, 'Chưa xác định') as funding_source, 
        COUNT(*) as count,
        SUM(COALESCE(purchase_price, 0)) as total_value
      FROM devices
      GROUP BY funding_source
      ORDER BY count DESC
    `);

    // 5. Warranty Summary
    const warrantySummary = await query(`
      SELECT 
        COUNT(CASE WHEN warranty_end IS NOT NULL AND warranty_end < CURRENT_DATE THEN 1 END) as expired_count,
        COUNT(CASE WHEN warranty_end IS NOT NULL AND warranty_end >= CURRENT_DATE AND warranty_end <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_30_count,
        COUNT(CASE WHEN warranty_end IS NOT NULL AND warranty_end > CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as active_count,
        COUNT(CASE WHEN warranty_end IS NULL THEN 1 END) as no_warranty_count
      FROM devices
    `);

    // 6. Expiring Warranty Devices (within next 90 days)
    const expiringDevices = await query(`
      SELECT asset_code, name, location, warranty_end, supplier, status
      FROM devices
      WHERE warranty_end IS NOT NULL AND warranty_end <= CURRENT_DATE + INTERVAL '90 days' AND status != 'liquidated'
      ORDER BY warranty_end ASC
    `);

    // 7. Incident and Repair Statistics
    const incidentStats = await query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_incidents,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_incidents,
        COUNT(CASE WHEN status = 'reported' THEN 1 END) as reported_incidents,
        SUM(COALESCE(repair_cost, 0)) as total_repair_cost
      FROM incidents
    `);

    // 8. Top 10 Most Incidents Devices
    const topFailingDevices = await query(`
      SELECT 
        d.asset_code, 
        d.name as device_name, 
        d.location, 
        COUNT(i.id) as incident_count, 
        SUM(COALESCE(i.repair_cost, 0)) as total_repair_cost
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      GROUP BY d.asset_code, d.name, d.location
      ORDER BY incident_count DESC, total_repair_cost DESC
      LIMIT 10
    `);

    // 9. Incident Trend by Month
    const incidentTrend = await query(`
      SELECT 
        TO_CHAR(reported_date, 'YYYY-MM') as month,
        COUNT(*) as incident_count,
        SUM(COALESCE(repair_cost, 0)) as total_repair_cost
      FROM incidents
      GROUP BY TO_CHAR(reported_date, 'YYYY-MM')
      ORDER BY month ASC
      LIMIT 12
    `);

    // 10. Consumables Inventory Summary
    const consumablesSummary = await query(`
      SELECT 
        name, 
        type, 
        current_qty, 
        min_qty, 
        unit, 
        price, 
        (current_qty * price) as total_value
      FROM consumables
      ORDER BY (current_qty <= min_qty) DESC, current_qty ASC
    `);

    // 11. MTTR and MTBF calculations
    const mttrRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_date - reported_date))/3600) as avg_repair_hours
      FROM incidents 
      WHERE status = 'resolved' AND resolved_date IS NOT NULL
    `);
    
    const mtbfRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.reported_date - d.purchase_date))/86400) as avg_uptime_days
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      WHERE d.purchase_date IS NOT NULL
    `);

    // 12. CMMS Specific Maintenance Summary (PM vs CM)
    const pmStats = await query(`
      SELECT
        (SELECT count(*) FROM maintenance_plans WHERE status = 'completed') as completed_pm,
        (SELECT count(*) FROM maintenance_plans WHERE status = 'planned') as planned_pm,
        (SELECT SUM(COALESCE(cost, 0)) FROM maintenance_plans WHERE status = 'completed') as total_pm_cost
    `);
    const completedPm = parseInt(pmStats.rows[0].completed_pm || 0);
    const plannedPm = parseInt(pmStats.rows[0].planned_pm || 0);
    const totalPmCost = parseFloat(pmStats.rows[0].total_pm_cost || 0);
    const resolvedCm = parseInt(incidentStats.rows[0].resolved_incidents || 0);

    const pmRatio = (completedPm + resolvedCm) > 0 
      ? parseFloat((completedPm / (completedPm + resolvedCm)) * 100).toFixed(1)
      : 100;

    return new Response(JSON.stringify({
      success: true,
      data: {
        deviceStats: deviceStats.rows[0],
        categoryBreakdown: categoryBreakdown.rows,
        deptBreakdown: deptBreakdown.rows,
        fundingBreakdown: fundingBreakdown.rows,
        warrantySummary: warrantySummary.rows[0],
        expiringDevices: expiringDevices.rows,
        incidentStats: incidentStats.rows[0],
        topFailingDevices: topFailingDevices.rows,
        incidentTrend: incidentTrend.rows,
        consumablesSummary: consumablesSummary.rows,
        performanceMetrics: {
          mttrHours: mttrRes.rows[0]?.avg_repair_hours ? parseFloat(mttrRes.rows[0].avg_repair_hours).toFixed(1) : 0,
          mtbfDays: mtbfRes.rows[0]?.avg_uptime_days ? parseFloat(mtbfRes.rows[0].avg_uptime_days).toFixed(1) : 180,
          pmRatio: pmRatio,
          completedPmCount: completedPm,
          plannedPmCount: plannedPm,
          totalPmCost: totalPmCost
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating reports data:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
