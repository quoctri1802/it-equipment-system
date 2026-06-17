import React, { useState, useEffect } from 'react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setLogs(json.logs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Nhật ký Thao tác Hệ thống</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ghi lại toàn bộ lịch sử hoạt động trên phần mềm để kiểm tra và phân tích bảo mật.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải nhật ký thao tác...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Không có nhật ký nào được ghi nhận.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Tài khoản</th>
                <th>Hành động</th>
                <th>Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.user_name || 'Khách'}</td>
                  <td><code>{log.username || 'guest'}</code></td>
                  <td>
                    <span 
                      className={`status-badge ${
                        log.action.includes('báo hỏng') || log.action.includes('Thanh lý') 
                          ? 'broken' 
                          : log.action.includes('Nhập') || log.action.includes('Tạo')
                            ? 'active' 
                            : 'in_stock'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
