import React, { useState, useEffect } from 'react';

export default function Reports({ user }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('assets'); // assets, incidents, warranty, inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu báo cáo hệ thống...</div>;
  if (error) return <div style={{ padding: '40px', color: 'red' }}>Lỗi: {error}</div>;
  if (!reportData) return <div style={{ padding: '40px', textAlign: 'center' }}>Không có dữ liệu báo cáo.</div>;

  const {
    deviceStats = {},
    categoryBreakdown = [],
    deptBreakdown = [],
    fundingBreakdown = [],
    warrantySummary = {},
    expiringDevices = [],
    incidentStats = {},
    topFailingDevices = [],
    incidentTrend = [],
    consumablesSummary = [],
    performanceMetrics = {}
  } = reportData;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusText = (status) => {
    const statusMap = {
      in_stock: 'Trong kho',
      active: 'Đang hoạt động',
      broken: 'Hỏng hóc',
      maintenance: 'Đang bảo trì',
      waiting_liquidation: 'Chờ thanh lý',
      liquidated: 'Đã thanh lý'
    };
    return statusMap[status] || status;
  };

  // CSV Exporter Helper
  const exportToCSV = (reportName, headers, rows) => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // print window builder helper
  const handlePrint = (title, contentHtml) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header-report { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; }
            .report-title { text-align: center; text-transform: uppercase; font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 15px 0 5px 0; }
            .report-subtitle { text-align: center; font-size: 13px; font-style: italic; color: #555; margin-bottom: 25px; }
            .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            .report-table th, .report-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            .report-table th { background-color: #f1f5f9; color: #1e3a8a; font-weight: 700; }
            .report-table tr:nth-child(even) td { background-color: #f8fafc; }
            .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
            .summary-item { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background: #fafafa; }
            .summary-item .label { font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; }
            .summary-item .val { font-size: 18px; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
            .footer-sign { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; }
            .sign-col { text-align: center; width: 200px; }
            .sign-space { height: 80px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-report">
            <img src="/logo.png" width="55" height="55" style="object-fit: contain;" />
            <div>
              <div style="font-weight: 800; font-size: 13px; color: #1e3a8a; letter-spacing: 0.3px;">SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG</div>
              <div style="font-weight: 800; font-size: 12px; color: #1e3a8a; letter-spacing: 0.3px;">TRUNG TÂM Y TẾ KHU VỰC LIÊN CHIỂU</div>
              <div style="font-size: 10px; color: #555; margin-top: 2px;">Địa chỉ: 525 Tôn Đức Thắng, Hòa Khánh Nam, Liên Chiểu, Đà Nẵng</div>
            </div>
          </div>
          
          <h2 class="report-title">${title}</h2>
          <div class="report-subtitle">Ngày lập báo cáo: ${new Date().toLocaleDateString('vi-VN')} - Người lập: ${user?.name || 'Cán bộ CNTT'}</div>
          
          ${contentHtml}

          <div class="footer-sign">
            <div class="sign-col">
              <strong>Người lập báo cáo</strong><br/>
              <span style="font-size: 11px; color: #555;">(Ký, ghi rõ họ tên)</span>
              <div class="sign-space"></div>
              <span>${user?.name}</span>
            </div>
            <div class="sign-col">
              <strong>Trưởng phòng CNTT</strong><br/>
              <span style="font-size: 11px; color: #555;">(Ký, ghi rõ họ tên)</span>
              <div class="sign-space"></div>
              <span style="border-bottom: 1px dotted #aaa; display: inline-block; width: 120px;"></span>
            </div>
            <div class="sign-col">
              <strong>Ban Giám Đốc Duyệt</strong><br/>
              <span style="font-size: 11px; color: #555;">(Ký, đóng dấu)</span>
              <div class="sign-space"></div>
              <span style="border-bottom: 1px dotted #aaa; display: inline-block; width: 120px;"></span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Category values summary calculation
  const totalValuation = parseFloat(deviceStats.total_value || 0);
  const brokenCount = parseInt(deviceStats.broken_count || 0);
  const activeCount = parseInt(deviceStats.active_count || 0);
  const maintenanceCount = parseInt(deviceStats.maintenance_count || 0);
  const instockCount = parseInt(deviceStats.instock_count || 0);
  const totalCount = parseInt(deviceStats.total_count || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>Báo cáo & Thống kê thiết bị</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Xuất dữ liệu, in báo cáo định kỳ tình trạng phần cứng, sự cố và khấu hao tài sản CNTT.</p>
        </div>
      </div>

      {/* Main KPI Stats Block */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Tổng giá trị thiết bị</span>
            <span className="metric-value" style={{ fontSize: '1.3rem', color: '#10b981' }}>{formatCurrency(totalValuation)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đã khai báo tài sản</span>
          </div>
          <div className="metric-icon" style={{ color: '#10b981' }}>💰</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Tổng số thiết bị</span>
            <span className="metric-value">{totalCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeCount} đang hoạt động</span>
          </div>
          <div className="metric-icon" style={{ color: 'var(--accent-secondary)' }}>💻</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Thiết bị hỏng hóc/bảo trì</span>
            <span className="metric-value" style={{ color: '#f59e0b' }}>{brokenCount + maintenanceCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{brokenCount} hỏng, {maintenanceCount} đang sửa</span>
          </div>
          <div className="metric-icon" style={{ color: '#f59e0b' }}>⚠️</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-info">
            <span className="metric-label">Khấu hao ước tính (10%/năm)</span>
            <span className="metric-value" style={{ fontSize: '1.3rem', color: '#f43f5e' }}>{formatCurrency(totalValuation * 0.1)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chi phí khấu hao bình quân</span>
          </div>
          <div className="metric-icon" style={{ color: '#f43f5e' }}>📉</div>
        </div>
      </div>

      {/* Tabs list navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '10px' }}>
        <button 
          className={`btn ${activeTab === 'assets' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 18px' }}
          onClick={() => setActiveTab('assets')}
        >
          💻 Báo cáo Tài sản & Phân bố
        </button>
        <button 
          className={`btn ${activeTab === 'incidents' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 18px' }}
          onClick={() => setActiveTab('incidents')}
        >
          🔧 Báo cáo Sự cố & Chi phí
        </button>
        <button 
          className={`btn ${activeTab === 'warranty' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 18px' }}
          onClick={() => setActiveTab('warranty')}
        >
          🛡️ Báo cáo Bảo hành & Hợp đồng
        </button>
        <button 
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 18px' }}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Báo cáo Linh kiện & Tồn kho
        </button>
      </div>

      {/* TAB SUB-PAGES */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* SUB-TAB 1: ASSETS REPORT */}
        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Phân bố tài sản CNTT theo danh mục & khoa/phòng</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Thống kê số lượng máy móc và giá trị đầu tư thiết bị tại từng đơn vị sử dụng.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  const headers = ['Khoa / Phòng sử dụng', 'Số lượng thiết bị', 'Tổng giá trị đầu tư'];
                  const rows = deptBreakdown.map(d => [d.department, d.count, formatCurrency(parseFloat(d.total_value))]);
                  exportToCSV('Phan_bo_tai_san_khoa_phong', headers, rows);
                }}>
                  📥 Xuất Excel
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const content = `
                    <div class="summary-box">
                      <div class="summary-item">
                        <div class="label">Tổng giá trị thiết bị</div>
                        <div class="val">${formatCurrency(totalValuation)}</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Tổng số thiết bị</div>
                        <div class="val">${totalCount} Máy</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Đang hoạt động</div>
                        <div class="val">${activeCount}</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Đang báo hỏng</div>
                        <div class="val">${brokenCount}</div>
                      </div>
                    </div>
                    
                    <h3>1. Phân bố theo Khoa / Phòng</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Khoa / Phòng sử dụng</th>
                          <th>Số lượng thiết bị</th>
                          <th>Tổng giá trị đầu tư</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${deptBreakdown.map(d => `
                          <tr>
                            <td><strong>${d.department}</strong></td>
                            <td>${d.count}</td>
                            <td>${formatCurrency(parseFloat(d.total_value))}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>

                    <h3 style="margin-top: 30px;">2. Phân bố theo Danh mục</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Danh mục thiết bị</th>
                          <th>Số lượng</th>
                          <th>Giá trị đầu tư</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${categoryBreakdown.map(c => `
                          <tr>
                            <td><strong>${c.category_name}</strong></td>
                            <td>${c.count}</td>
                            <td>${formatCurrency(parseFloat(c.total_value))}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `;
                  handlePrint('BÁO CÁO PHÂN BỐ TÀI SẢN THIẾT BỊ CNTT', content);
                }}>
                  🖨️ In báo cáo
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', alignItems: 'start' }}>
              {/* Tables */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Khoa / Phòng sử dụng</th>
                        <th>Số lượng thiết bị</th>
                        <th>Tổng giá trị đầu tư</th>
                        <th>Tỷ lệ giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptBreakdown.map((d, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 700 }}>{d.department}</td>
                          <td>{d.count} thiết bị</td>
                          <td style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(parseFloat(d.total_value))}</td>
                          <td>{totalValuation > 0 ? `${((parseFloat(d.total_value) / totalValuation) * 100).toFixed(1)}%` : '0%'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Nhóm danh mục</th>
                        <th>Số lượng</th>
                        <th>Giá trị đầu tư</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBreakdown.map((c, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 700 }}>{c.category_name}</td>
                          <td>{c.count} chiếc</td>
                          <td style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(parseFloat(c.total_value))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic SVG Visual Charts for distribution */}
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Biểu đồ phân bố giá trị thiết bị theo khoa (%)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {deptBreakdown.slice(0, 5).map((d, idx) => {
                    const percentage = totalValuation > 0 ? (parseFloat(d.total_value) / totalValuation) * 100 : 0;
                    const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                    const barColor = colors[idx % colors.length];
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span>{d.department}</span>
                          <strong>{percentage.toFixed(1)}% ({formatCurrency(parseFloat(d.total_value))})</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '20px' }}>Phân bố nguồn kinh phí mua sắm</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                  {fundingBreakdown.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.funding_source}</span>
                      <strong>{f.count} thiết bị ({formatCurrency(parseFloat(f.total_value))})</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: INCIDENTS REPORT */}
        {activeTab === 'incidents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Phân tích sự cố hỏng hóc & Hiệu suất kỹ thuật</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Theo dõi chỉ số MTTR (thời gian sửa chữa), MTBF (thời gian hoạt động ổn định) và chi phí sửa chữa.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  const headers = ['Mã thiết bị', 'Tên thiết bị', 'Khoa phòng', 'Số lần báo sự cố', 'Tổng chi phí sửa chữa (VND)'];
                  const rows = topFailingDevices.map(d => [d.asset_code, d.device_name, d.location, d.incident_count, d.total_repair_cost]);
                  exportToCSV('Thiet_bi_bao_su_co_nhieu_nhat', headers, rows);
                }}>
                  📥 Xuất Excel
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const content = `
                    <div class="summary-box" style="grid-template-columns: repeat(6, 1fr);">
                      <div class="summary-item">
                        <div class="label">Tổng sự cố (CM)</div>
                        <div class="val">${incidentStats.total_incidents || 0} Phiếu</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Chi phí sửa CM</div>
                        <div class="val">${formatCurrency(parseFloat(incidentStats.total_repair_cost || 0))}</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Thời gian MTTR</div>
                        <div class="val">${performanceMetrics.mttrHours || 0} Giờ</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Thời gian MTBF</div>
                        <div class="val">${performanceMetrics.mtbfDays || 0} Ngày</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">PM Ratio</div>
                        <div class="val" style="color: #d946ef; font-weight: 800;">${performanceMetrics.pmRatio || 100}%</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Chi phí PM</div>
                        <div class="val">${formatCurrency(parseFloat(performanceMetrics.totalPmCost || 0))}</div>
                      </div>
                    </div>
                    
                    <h3>Top 10 thiết bị phát sinh sự cố nhiều nhất</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Mã thiết bị</th>
                          <th>Tên thiết bị</th>
                          <th>Khoa phòng sử dụng</th>
                          <th>Số lần hỏng</th>
                          <th>Chi phí sửa chữa</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${topFailingDevices.map(d => `
                          <tr>
                            <td><strong>${d.asset_code}</strong></td>
                            <td>${d.device_name}</td>
                            <td>${d.location}</td>
                            <td>${d.incident_count} lần</td>
                            <td>${formatCurrency(parseFloat(d.total_repair_cost))}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>

                    <h3 style="margin-top: 30px;">Lịch sử sửa chữa theo tháng</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Tháng</th>
                          <th>Số lượng sự cố</th>
                          <th>Tổng chi phí sửa chữa</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${incidentTrend.map(t => `
                          <tr>
                            <td><strong>Tháng ${t.month}</strong></td>
                            <td>${t.incident_count} sự cố</td>
                            <td>${formatCurrency(parseFloat(t.total_repair_cost))}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `;
                  handlePrint('BÁO CÁO PHÂN TÍCH SỰ CỐ & CHI PHÍ SỬA CHỮA', content);
                }}>
                  🖨️ In báo cáo
                </button>
              </div>
            </div>

            {/* Performance Indicators Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thời gian sửa chữa trung bình (MTTR)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#38bdf8' }}>{performanceMetrics.mttrHours || 0} Giờ</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Thời gian trung bình xử lý sự cố.</div>
              </div>

              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #a5b4fc' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thời gian chạy ổn định (MTBF)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#a5b4fc' }}>{performanceMetrics.mtbfDays || 0} Ngày</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Thời gian bình quân giữa 2 sự cố hỏng hóc.</div>
              </div>

              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tổng chi phí sửa sự cố (CM)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#ef4444' }}>{formatCurrency(parseFloat(incidentStats.total_repair_cost || 0))}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chi phí linh kiện & sửa chữa sự cố khẩn cấp.</div>
              </div>

              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tỷ lệ sửa thành công</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#10b981' }}>
                  {incidentStats.total_incidents > 0 ? ((incidentStats.resolved_incidents / incidentStats.total_incidents) * 100).toFixed(1) : 100}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{incidentStats.resolved_incidents} / {incidentStats.total_incidents} sự cố được hoàn tất.</div>
              </div>

              <div className="glass-card border-glow-purple" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--accent-pink)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tỷ lệ Bảo trì Phòng ngừa (PM Ratio)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: 'var(--accent-pink)' }}>{performanceMetrics.pmRatio || 100}%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tỷ lệ phiếu bảo dưỡng chủ động trên tổng số phiếu.</div>
              </div>

              <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--accent-secondary)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tổng chi phí bảo dưỡng định kỳ</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: 'var(--accent-secondary)' }}>{formatCurrency(parseFloat(performanceMetrics.totalPmCost || 0))}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Đã cộng dồn linh kiện phục vụ bảo trì chu kỳ.</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              
              {/* Top Failing Devices */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Top thiết bị phát sinh nhiều sự cố nhất</h4>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Mã thiết bị</th>
                        <th>Thiết bị</th>
                        <th>Vị trí sử dụng</th>
                        <th>Số lần hỏng</th>
                        <th>Tổng chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topFailingDevices.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa ghi nhận sự cố hỏng hóc nào.</td></tr>
                      ) : (
                        topFailingDevices.map((d, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{d.asset_code}</td>
                            <td>{d.device_name}</td>
                            <td>{d.location}</td>
                            <td style={{ fontWeight: 700, color: '#f59e0b' }}>{d.incident_count} lần</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(parseFloat(d.total_repair_cost))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Trend Table/Graph details */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Diễn biến chi phí sửa chữa qua các tháng</h4>
                
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Tháng</th>
                        <th>Số lượng sự cố</th>
                        <th>Chi phí sửa chữa tháng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentTrend.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa ghi nhận số liệu tháng.</td></tr>
                      ) : (
                        incidentTrend.map((t, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 700 }}>Tháng {t.month}</td>
                            <td>{t.incident_count} lỗi</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{formatCurrency(parseFloat(t.total_repair_cost))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUB-TAB 3: WARRANTY & CONTRACTS REPORT */}
        {activeTab === 'warranty' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Theo dõi tình trạng bảo hành & hợp đồng thiết bị</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Thống kê máy hết hạn bảo hành, sắp hết hạn trong 30-90 ngày để chủ động liên hệ nhà cung cấp bảo trì.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  const headers = ['Mã thiết bị', 'Tên thiết bị', 'Vị trí sử dụng', 'Hết hạn bảo hành', 'Nhà cung cấp', 'Trạng thái máy'];
                  const rows = expiringDevices.map(d => [d.asset_code, d.name, d.location, new Date(d.warranty_end).toLocaleDateString('vi-VN'), d.supplier, getStatusText(d.status)]);
                  exportToCSV('Thiet_bi_sap_het_han_bao_hanh', headers, rows);
                }}>
                  📥 Xuất Excel
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const content = `
                    <div class="summary-box">
                      <div class="summary-item">
                        <div class="label">Bảo hành còn hiệu lực</div>
                        <div class="val">${warrantySummary.active_count || 0} Máy</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Sắp hết hạn (30 ngày)</div>
                        <div class="val" style="color: #f59e0b">${warrantySummary.expiring_30_count || 0}</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Đã hết hạn bảo hành</div>
                        <div class="val" style="color: #ef4444">${warrantySummary.expired_count || 0}</div>
                      </div>
                      <div class="summary-item">
                        <div class="label">Chưa khai báo bảo hành</div>
                        <div class="val">${warrantySummary.no_warranty_count || 0}</div>
                      </div>
                    </div>
                    
                    <h3>Danh sách thiết bị sắp hết hạn bảo hành (trong vòng 90 ngày)</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Mã thiết bị</th>
                          <th>Tên thiết bị</th>
                          <th>Vị trí sử dụng</th>
                          <th>Ngày hết hạn</th>
                          <th>Nhà cung cấp</th>
                          <th>Tình trạng máy</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${expiringDevices.map(d => {
                          const isExpired = new Date(d.warranty_end) < new Date();
                          return `
                            <tr>
                              <td><strong>${d.asset_code}</strong></td>
                              <td>${d.name}</td>
                              <td>${d.location}</td>
                              <td style="color: ${isExpired ? '#ef4444' : '#f59e0b'}; font-weight: 700;">
                                ${new Date(d.warranty_end).toLocaleDateString('vi-VN')} ${isExpired ? '(Đã hết)' : ''}
                              </td>
                              <td>${d.supplier || 'N/A'}</td>
                              <td>${getStatusText(d.status)}</td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  `;
                  handlePrint('BÁO CÁO GIÁM SÁT HẠN BẢO HÀNH THIẾT BỊ', content);
                }}>
                  🖨️ In báo cáo
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', alignItems: 'start' }}>
              
              {/* Expiring list */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Thiết bị hết hạn hoặc sắp hết hạn (&lt; 90 ngày)</h4>
                
                <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Mã thiết bị</th>
                        <th>Tên thiết bị</th>
                        <th>Khoa phòng</th>
                        <th>Ngày hết hạn</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringDevices.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Không có máy nào sắp hết hạn bảo hành.</td></tr>
                      ) : (
                        expiringDevices.map((d, index) => {
                          const isExpired = new Date(d.warranty_end) < new Date();
                          return (
                            <tr key={index}>
                              <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{d.asset_code}</td>
                              <td>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NCC: {d.supplier || 'Chưa rõ'}</div>
                                </div>
                              </td>
                              <td>{d.location}</td>
                              <td style={{ fontWeight: 700, color: isExpired ? '#f43f5e' : '#f59e0b' }}>
                                {new Date(d.warranty_end).toLocaleDateString('vi-VN')}
                              </td>
                              <td>
                                <span className={`status-badge ${isExpired ? 'broken' : 'active'}`} style={{ fontSize: '0.62rem', padding: '2px 5px' }}>
                                  {isExpired ? 'Hết hạn' : 'Sắp hết'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warranty Summary Charts Card */}
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Phân bố trạng thái bảo hành</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyValues: 'space-between', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span>Còn hiệu lực bảo hành:</span>
                    <strong>{warrantySummary.active_count || 0} máy</strong>
                  </div>
                  <div style={{ display: 'flex', justifyValues: 'space-between', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: '#f59e0b' }}>Sắp hết hạn (&lt;30 ngày):</span>
                    <strong style={{ color: '#f59e0b' }}>{warrantySummary.expiring_30_count || 0} máy</strong>
                  </div>
                  <div style={{ display: 'flex', justifyValues: 'space-between', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: '#f43f5e' }}>Đã hết hạn bảo hành:</span>
                    <strong style={{ color: '#f43f5e' }}>{warrantySummary.expired_count || 0} máy</strong>
                  </div>
                  <div style={{ display: 'flex', justifyValues: 'space-between', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chưa khai thông tin:</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>{warrantySummary.no_warranty_count || 0} máy</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '15px', paddingTop: '15px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  💡 <strong>Khuyến nghị CNTT:</strong> Các thiết bị có ngày bảo hành kết thúc trùng khớp với các thời điểm nâng cấp hạ tầng cần lập hồ sơ gia hạn hoặc đàm phán mua dịch vụ chăm sóc kỹ thuật bổ sung để tránh rủi ro hỏng hóc lớn không có linh kiện thay thế.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUB-TAB 4: INVENTORY / CONSUMABLES REPORT */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Báo cáo tồn kho linh kiện & vật tư tiêu hao</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Theo dõi tồn kho linh kiện thay thế khẩn cấp (SSD, RAM, Mực in...) để lên kế hoạch đặt mua trước khi cạn kiệt.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  const headers = ['Tên linh kiện', 'Phân loại', 'Số lượng tồn', 'Tối thiểu', 'Đơn vị tính', 'Đơn giá (VND)', 'Tổng giá trị tồn (VND)'];
                  const rows = consumablesSummary.map(c => [c.name, c.type, c.current_qty, c.min_qty, c.unit, c.price, c.total_value]);
                  exportToCSV('Bao_cao_linh_kien_ton_kho', headers, rows);
                }}>
                  📥 Xuất Excel
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const content = `
                    <h3>Danh sách kiểm kê tồn kho linh kiện vật tư</h3>
                    <table class="report-table">
                      <thead>
                        <tr>
                          <th>Tên linh kiện / Vật tư</th>
                          <th>Phân loại</th>
                          <th>Tồn hiện tại</th>
                          <th>Định mức tối thiểu</th>
                          <th>Đơn vị tính</th>
                          <th>Đơn giá</th>
                          <th>Tổng giá trị tồn</th>
                          <th>Đánh giá kho</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${consumablesSummary.map(c => {
                          const isLow = c.current_qty <= c.min_qty;
                          return `
                            <tr>
                              <td><strong>${c.name}</strong></td>
                              <td>${c.type.toUpperCase()}</td>
                              <td style="color: ${isLow ? '#ef4444' : 'inherit'}; font-weight: 700;">${c.current_qty}</td>
                              <td>${c.min_qty}</td>
                              <td>${c.unit}</td>
                              <td>${formatCurrency(parseFloat(c.price))}</td>
                              <td>${formatCurrency(parseFloat(c.total_value))}</td>
                              <td style="color: ${isLow ? '#ef4444' : 'green'}; font-weight: 700;">
                                ${isLow ? '⚠️ CẦN NHẬP THÊM' : 'An toàn'}
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  `;
                  handlePrint('BÁO CÁO KIỂM KÊ KHO VẬT TƯ TIÊU HAO CNTT', content);
                }}>
                  🖨️ In báo cáo
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Tên linh kiện vật tư</th>
                    <th>Phân loại</th>
                    <th>Số lượng tồn</th>
                    <th>Hạn mức tối thiểu</th>
                    <th>Đơn vị</th>
                    <th>Đơn giá mua</th>
                    <th>Giá trị tồn kho</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {consumablesSummary.map((c, index) => {
                    const isLow = c.current_qty <= c.min_qty;
                    return (
                      <tr key={index} style={{ background: isLow ? 'rgba(239, 68, 68, 0.03)' : 'inherit' }}>
                        <td style={{ fontWeight: 700 }}>{c.name}</td>
                        <td>{c.type.toUpperCase()}</td>
                        <td style={{ fontWeight: 700, color: isLow ? '#f43f5e' : 'inherit' }}>{c.current_qty} {c.unit}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.min_qty} {c.unit}</td>
                        <td>{c.unit}</td>
                        <td>{formatCurrency(parseFloat(c.price))}</td>
                        <td style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{formatCurrency(parseFloat(c.total_value))}</td>
                        <td>
                          <span className={`status-badge ${isLow ? 'broken' : 'active'}`} style={{ fontSize: '0.62rem', padding: '2px 5px' }}>
                            {isLow ? 'Cảnh báo: Hết' : 'Sẵn sàng'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
