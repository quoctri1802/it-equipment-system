import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const department = url.searchParams.get('department') || '';
    const category = url.searchParams.get('category') || '';

    // Helper to generate dynamic WHERE clause and params
    const getWhereAndParams = (baseIndex, tableAlias = 'd') => {
      let clause = '';
      const sqlParams = [];
      let idx = baseIndex;
      if (department) {
        // support_requests has department column directly, devices has location
        if (tableAlias === 'sr') {
          clause += ` AND sr.department = $${idx}`;
        } else {
          clause += ` AND ${tableAlias}.location = $${idx}`;
        }
        sqlParams.push(department);
        idx++;
      }
      if (category) {
        clause += ` AND c.name = $${idx}`;
        sqlParams.push(category);
        idx++;
      }
      return { clause, params: sqlParams, nextIndex: idx };
    };

    // 1. General Device Statistics
    const filter1 = getWhereAndParams(1, 'd');
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
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter1.clause}
    `, filter1.params);

    // 2. Breakdown by Category
    const filter2 = getWhereAndParams(1, 'd');
    const categoryBreakdown = await query(`
      SELECT 
        c.name as category_name, 
        COUNT(d.id) as count,
        SUM(COALESCE(d.purchase_price, 0)) as total_value
      FROM categories c
      LEFT JOIN devices d ON d.category_id = c.id ${filter2.clause}
      GROUP BY c.name
      ORDER BY count DESC
    `, filter2.params);

    // 3. Breakdown by Department / Location
    const filter3 = getWhereAndParams(1, 'd');
    const deptBreakdown = await query(`
      SELECT 
        COALESCE(d.location, 'Chưa xác định') as department, 
        COUNT(*) as count,
        SUM(COALESCE(d.purchase_price, 0)) as total_value
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.status != 'liquidated' ${filter3.clause}
      GROUP BY d.location
      ORDER BY count DESC
    `, filter3.params);

    // 4. Breakdown by Funding Source
    const filter4 = getWhereAndParams(1, 'd');
    const fundingBreakdown = await query(`
      SELECT 
        COALESCE(d.funding_source, 'Chưa xác định') as funding_source, 
        COUNT(*) as count,
        SUM(COALESCE(d.purchase_price, 0)) as total_value
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter4.clause}
      GROUP BY d.funding_source
      ORDER BY count DESC
    `, filter4.params);

    // 5. Warranty Summary
    const filter5 = getWhereAndParams(1, 'd');
    const warrantySummary = await query(`
      SELECT 
        COUNT(CASE WHEN d.warranty_end IS NOT NULL AND d.warranty_end < CURRENT_DATE THEN 1 END) as expired_count,
        COUNT(CASE WHEN d.warranty_end IS NOT NULL AND d.warranty_end >= CURRENT_DATE AND d.warranty_end <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_30_count,
        COUNT(CASE WHEN d.warranty_end IS NOT NULL AND d.warranty_end > CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as active_count,
        COUNT(CASE WHEN d.warranty_end IS NULL THEN 1 END) as no_warranty_count
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter5.clause}
    `, filter5.params);

    // 6. Expiring Warranty Devices (within next 90 days)
    const filter6 = getWhereAndParams(1, 'd');
    const expiringDevices = await query(`
      SELECT d.asset_code, d.name, d.location, d.warranty_end, d.supplier, d.status
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.warranty_end IS NOT NULL AND d.warranty_end <= CURRENT_DATE + INTERVAL '90 days' AND d.status != 'liquidated' ${filter6.clause}
      ORDER BY d.warranty_end ASC
    `, filter6.params);

    // 7. Incident and Repair Statistics
    const filter7 = getWhereAndParams(1, 'd');
    const incidentStats = await query(`
      SELECT 
        COUNT(i.id) as total_incidents,
        COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) as resolved_incidents,
        COUNT(CASE WHEN i.status = 'processing' THEN 1 END) as processing_incidents,
        COUNT(CASE WHEN i.status = 'reported' THEN 1 END) as reported_incidents,
        SUM(COALESCE(i.repair_cost, 0)) as total_repair_cost
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter7.clause}
    `, filter7.params);

    // 8. Top 10 Most Incidents Devices
    const filter8 = getWhereAndParams(1, 'd');
    const topFailingDevices = await query(`
      SELECT 
        d.asset_code, 
        d.name as device_name, 
        d.location, 
        COUNT(i.id) as incident_count, 
        SUM(COALESCE(i.repair_cost, 0)) as total_repair_cost
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter8.clause}
      GROUP BY d.asset_code, d.name, d.location
      ORDER BY incident_count DESC, total_repair_cost DESC
      LIMIT 10
    `, filter8.params);

    // 9. Incident Trend by Month
    const filter9 = getWhereAndParams(1, 'd');
    const incidentTrend = await query(`
      SELECT 
        TO_CHAR(i.reported_date, 'YYYY-MM') as month,
        COUNT(i.id) as incident_count,
        SUM(COALESCE(i.repair_cost, 0)) as total_repair_cost
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter9.clause}
      GROUP BY TO_CHAR(i.reported_date, 'YYYY-MM')
      ORDER BY month ASC
      LIMIT 12
    `, filter9.params);

    // 10. Consumables Summary (general inventory, not directly device-filtered)
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
    const filter11_a = getWhereAndParams(1, 'd');
    const mttrRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.resolved_date - i.reported_date))/3600) as avg_repair_hours
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE i.status = 'resolved' AND i.resolved_date IS NOT NULL ${filter11_a.clause}
    `, filter11_a.params);
    
    const filter11_b = getWhereAndParams(1, 'd');
    const mtbfRes = await query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (i.reported_date - d.purchase_date))/86400) as avg_uptime_days
      FROM incidents i
      JOIN devices d ON i.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.purchase_date IS NOT NULL ${filter11_b.clause}
    `, filter11_b.params);

    // 12. CMMS Specific Maintenance Summary (PM vs CM)
    const filter12_pm = getWhereAndParams(1, 'd');
    const completedPmRes = await query(`
      SELECT count(*) as count 
      FROM maintenance_plans m 
      JOIN devices d ON m.device_id = d.id 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE m.status = 'completed' ${filter12_pm.clause}
    `, filter12_pm.params);

    const plannedPmRes = await query(`
      SELECT count(*) as count 
      FROM maintenance_plans m 
      JOIN devices d ON m.device_id = d.id 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE m.status = 'planned' ${filter12_pm.clause}
    `, filter12_pm.params);

    const costPmRes = await query(`
      SELECT SUM(COALESCE(m.cost, 0)) as cost 
      FROM maintenance_plans m 
      JOIN devices d ON m.cost IS NOT NULL AND m.device_id = d.id 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE m.status = 'completed' ${filter12_pm.clause}
    `, filter12_pm.params);

    const completedPm = parseInt(completedPmRes.rows[0]?.count || 0);
    const plannedPm = parseInt(plannedPmRes.rows[0]?.count || 0);
    const totalPmCost = parseFloat(costPmRes.rows[0]?.cost || 0);
    const resolvedCm = parseInt(incidentStats.rows[0].resolved_incidents || 0);

    const pmRatio = (completedPm + resolvedCm) > 0 
      ? parseFloat((completedPm / (completedPm + resolvedCm)) * 100).toFixed(1)
      : 100;

    // 13. Support Requests statistics
    const filter13_stats = getWhereAndParams(1, 'sr');
    const supportStats = await query(`
      SELECT 
        COUNT(sr.id) as total_requests,
        COUNT(CASE WHEN sr.status = 'submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN sr.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN sr.status = 'processing' THEN 1 END) as processing_count,
        COUNT(CASE WHEN sr.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN sr.status = 'rejected' THEN 1 END) as rejected_count
      FROM support_requests sr
      LEFT JOIN devices d ON sr.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter13_stats.clause}
    `, filter13_stats.params);

    const filter13_type = getWhereAndParams(1, 'sr');
    const supportTypeBreakdown = await query(`
      SELECT sr.request_type, COUNT(sr.id) as count
      FROM support_requests sr
      LEFT JOIN devices d ON sr.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE 1=1 ${filter13_type.clause}
      GROUP BY sr.request_type
    `, filter13_type.params);

    const filter13_list = getWhereAndParams(1, 'sr');
    const supportRequestsList = await query(`
      SELECT sr.*, d.name as device_name, d.asset_code, u.name as requester_name, a.name as assignee_name
      FROM support_requests sr
      LEFT JOIN devices d ON sr.device_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN users u ON sr.requester_id = u.id
      LEFT JOIN users a ON sr.assigned_to = a.id
      WHERE 1=1 ${filter13_list.clause}
      ORDER BY sr.created_at DESC
    `, filter13_list.params);

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
        supportStats: supportStats.rows[0],
        supportTypeBreakdown: supportTypeBreakdown.rows,
        supportRequestsList: supportRequestsList.rows,
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
