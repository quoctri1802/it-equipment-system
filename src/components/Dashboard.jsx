import React, { useState, useEffect } from 'react';
import Logo from './Logo';

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs.slice(0, 10)); // Take first 10 logs
      }
    } catch (e) {
      console.error('Lỗi tải nhật ký thao tác:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLogs();
    
    // Poll logs every 10 seconds for real-time vibe
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '20px' }}>
        <div className="rotate-slow pulsate">
          <Logo width={80} height={80} />
        </div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Đang đồng bộ dữ liệu hệ thống CMMS...</div>
      </div>
    );
  }

  if (error) return <div style={{ padding: '40px', color: '#f43f5e', textAlign: 'center' }}>⚠️ Lỗi tải dữ liệu: {error}</div>;

  const stats = data?.stats || {};
  const recentIncidents = data?.recentIncidents || [];

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Find counts
  const getCount = (status) => {
    return stats.statusCounts?.find(s => s.status === status)?.count || 0;
  };

  const totalDevices = stats.statusCounts?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
  const activeCount = parseInt(getCount('active'));
  const brokenCount = parseInt(getCount('broken'));
  const maintenanceCount = parseInt(getCount('maintenance'));
  const inStockCount = parseInt(getCount('in_stock'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner & Technology Slogan */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>Chào mừng trở lại!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Bảng điều khiển quản lý và bảo trì thiết bị CNTT - Bệnh viện Liên Chiểu.</p>
        </div>
        <div className="glass-card" style={{ padding: '8px 18px', borderRadius: '20px', borderColor: 'rgba(6, 182, 212, 0.35)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)', background: 'rgba(11, 15, 25, 0.85)' }}>
          <span className="glow-cyan" style={{ fontStyle: 'italic', fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
             Số hóa quy trình - Tối ưu hiệu năng - Kiến tạo y tế thông minh
          </span>
        </div>
      </div>

      {/* Warnings & Alerts banner */}
      {stats.lowStockCount > 0 && (
        <div className="alert-banner danger" style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)' }}>
          <span>⚠️</span>
          <span>Cảnh báo: Hiện có <strong>{stats.lowStockCount}</strong> linh kiện/vật tư tiêu hao đang ở dưới mức tồn kho tối thiểu. Vui lòng kiểm tra kho linh kiện!</span>
        </div>
      )}
      
      {stats.expiringWarningsCount > 0 && (
        <div className="alert-banner" style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.15)' }}>
          <span>🔔</span>
          <span>Cảnh báo: Có <strong>{stats.expiringWarningsCount}</strong> thiết bị hoặc hợp đồng bảo trì sắp hết hạn trong vòng 30 ngày tới.</span>
        </div>
      )}

      {/* KPI & Metrics Row 1 - Neon styled */}
      <div className="metrics-grid">
        <div className="glass-card metric-card border-glow-cyan">
          <div className="metric-info">
            <span className="metric-label">Tổng số thiết bị</span>
            <span className="metric-value glow-cyan">{totalDevices}</span>
          </div>
          <div className="metric-icon" style={{ color: 'var(--accent-secondary)' }}>💻</div>
        </div>
        
        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Đang hoạt động</span>
            <span className="metric-value glow-emerald" style={{ color: 'var(--status-active)' }}>{activeCount}</span>
          </div>
          <div className="metric-icon" style={{ color: 'var(--status-active)' }}>🟢</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Sự cố / Báo hỏng</span>
            <span className="metric-value glow-red" style={{ color: 'var(--status-broken)' }}>{brokenCount}</span>
          </div>
          <div className="metric-icon" style={{ color: 'var(--status-broken)' }}>🔴</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Đang bảo trì/sửa chữa</span>
            <span className="metric-value glow-orange" style={{ color: 'var(--status-maintenance)' }}>{maintenanceCount}</span>
          </div>
          <div className="metric-icon" style={{ color: 'var(--status-maintenance)' }}>🔧</div>
        </div>
      </div>

      {/* KPI & Metrics Row 2 - CMMS Specialty & Financials */}
      <div className="metrics-grid">
        {/* PM Ratio Gauge Card */}
        <div className="glass-card metric-card border-glow-purple">
          <div className="metric-info" style={{ flex: 1 }}>
            <span className="metric-label">Tỷ lệ Bảo trì Phòng ngừa</span>
            <span className="metric-value glow-purple" style={{ color: 'var(--accent-pink)' }}>{stats.pmRatio || 100}%</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Mục tiêu tối ưu CMMS: &gt; 80%</span>
          </div>
          <div className="kpi-gauge-container">
            <svg className="kpi-gauge-svg" width="90" height="90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cyanPurpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
              <circle className="kpi-gauge-bg" cx="50" cy="50" r="40" strokeWidth="8" />
              <circle className="kpi-gauge-fill" cx="50" cy="50" r="40" strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * parseFloat(stats.pmRatio || 100)) / 100}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>PM Ratio</div>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">MTTR (Sửa chữa trung bình)</span>
            <span className="metric-value glow-cyan" style={{ color: '#38bdf8' }}>{stats.mttrHours} Giờ</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Mục tiêu: &lt; 4 giờ</span>
          </div>
          <div className="metric-icon">⏱️</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">MTBF (Thời gian chạy ổn định)</span>
            <span className="metric-value glow-purple" style={{ color: '#a5b4fc' }}>{stats.mtbfDays} Ngày</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Chỉ số ổn định phần cứng</span>
          </div>
          <div className="metric-icon">📈</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Tổng chi phí bảo trì & sửa chữa</span>
            <span className="metric-value glow-orange" style={{ fontSize: '1.35rem', color: 'var(--status-maintenance)' }}>
              {formatCurrency(parseFloat(stats.totalRepairCost || 0) + parseFloat(stats.totalMaintenanceCost || 0))}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Đã cộng dồn linh kiện xuất kho</span>
          </div>
          <div className="metric-icon">💸</div>
        </div>
      </div>

      {/* Main Grid: Charts, Lists & System Logs */}
      <div className="dashboard-grid">
        
        {/* Left Side: Monthly Cost Trend & Recent Incidents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Cost Trend Chart (SVG) */}
          {stats.costTrend && stats.costTrend.length > 0 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Biến động Chi phí Bảo trì & Sửa chữa (6 tháng gần nhất)</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', padding: '15px 10px 5px 10px', borderBottom: '1px solid var(--border-color)' }}>
                {stats.costTrend.map((t, idx) => {
                  const maxCost = Math.max(...stats.costTrend.map(x => parseFloat(x.total_cost || 0)), 1000000);
                  const percent = (parseFloat(t.total_cost || 0) / maxCost) * 100;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '10px', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {formatCurrency(parseFloat(t.total_cost)).replace('₫', '')}
                      </span>
                      <div className="rotate-slow" style={{ 
                        width: '28px', 
                        height: `${percent * 0.9}%`, 
                        minHeight: '4px', 
                        background: 'linear-gradient(180deg, var(--accent-secondary) 0%, rgba(6,182,212,0.1) 100%)', 
                        borderRadius: '4px 4px 0 0', 
                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)',
                        transition: 'all 0.5s ease-in-out'
                      }}></div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{t.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent incidents queue */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Sự cố báo hỏng gần đây</h3>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchDashboardData}>Làm mới</button>
            </div>

            {recentIncidents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Không có sự cố nào gần đây cần xử lý.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã thiết bị</th>
                      <th>Thiết bị</th>
                      <th>Nội dung sự cố</th>
                      <th>Người báo</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentIncidents.map(inc => (
                      <tr key={inc.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{inc.asset_code}</td>
                        <td>{inc.device_name}</td>
                        <td>{inc.title}</td>
                        <td>{inc.reporter_name || 'Khách'}</td>
                        <td>
                          <span className={`status-badge ${inc.status}`}>
                            {inc.status === 'reported' && 'Mới báo'}
                            {inc.status === 'processing' && 'Đang sửa'}
                            {inc.status === 'resolved' && 'Đã xong'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Donut status & Live system stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status Donut Chart */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, width: '100%', textAlign: 'left' }}>Phân bố trạng thái tài sản</h3>
            
            <div style={{ position: 'relative', width: '180px', height: '180px', margin: '5px 0' }}>
              <svg width="180" height="180" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="16" />
                {totalDevices > 0 ? (
                  <>
                    {/* Active Segment */}
                    <circle cx="100" cy="100" r="80" fill="transparent" 
                      stroke="var(--status-active)" 
                      strokeWidth="16" 
                      strokeDasharray={`${(activeCount / totalDevices) * 502.4} 502.4`}
                      strokeDashoffset="0"
                      transform="rotate(-90 100 100)"
                      strokeLinecap="round"
                    />
                    {/* Broken Segment */}
                    <circle cx="100" cy="100" r="80" fill="transparent" 
                      stroke="var(--status-broken)" 
                      strokeWidth="16" 
                      strokeDasharray={`${(brokenCount / totalDevices) * 502.4} 502.4`}
                      strokeDashoffset={`-${(activeCount / totalDevices) * 502.4}`}
                      transform="rotate(-90 100 100)"
                      strokeLinecap="round"
                    />
                    {/* Maintenance Segment */}
                    <circle cx="100" cy="100" r="80" fill="transparent" 
                      stroke="var(--status-maintenance)" 
                      strokeWidth="16" 
                      strokeDasharray={`${(maintenanceCount / totalDevices) * 502.4} 502.4`}
                      strokeDashoffset={`-${((activeCount + brokenCount) / totalDevices) * 502.4}`}
                      transform="rotate(-90 100 100)"
                      strokeLinecap="round"
                    />
                    {/* In stock Segment */}
                    <circle cx="100" cy="100" r="80" fill="transparent" 
                      stroke="var(--status-instock)" 
                      strokeWidth="16" 
                      strokeDasharray={`${(inStockCount / totalDevices) * 502.4} 502.4`}
                      strokeDashoffset={`-${((activeCount + brokenCount + maintenanceCount) / totalDevices) * 502.4}`}
                      transform="rotate(-90 100 100)"
                      strokeLinecap="round"
                    />
                  </>
                ) : null}
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{totalDevices}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thiết bị</div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-active)', boxShadow: '0 0 5px var(--status-active)' }}></div>
                <span>Sử dụng ({activeCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-broken)', boxShadow: '0 0 5px var(--status-broken)' }}></div>
                <span>Hỏng ({brokenCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-maintenance)', boxShadow: '0 0 5px var(--status-maintenance)' }}></div>
                <span>Bảo trì ({maintenanceCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-instock)', boxShadow: '0 0 5px var(--status-instock)' }}></div>
                <span>Trong kho ({inStockCount})</span>
              </div>
            </div>
          </div>

          {/* Real-time Cyber console logs stream */}
          <div className="glass-card border-glow-cyan" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="pulsate" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)', boxShadow: '0 0 8px var(--accent-secondary)' }}></span>
              Giám sát Hoạt động Thời gian thực
            </h3>
            <div className="cyber-console">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Đang kết nối cổng giám sát...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="console-log-item">
                    <span className="console-time">[{new Date(log.created_at).toLocaleTimeString('vi-VN')}]</span>
                    <span className="console-action">{log.action}:</span>
                    <span className="console-details">{log.details}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
