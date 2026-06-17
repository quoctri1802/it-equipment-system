import React from 'react';
import Logo from './Logo';

export default function Sidebar({ activeTab, setActiveTab, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: '📊', roles: ['admin', 'director', 'accountant', 'itstaff', 'depthead'] },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: '📈', roles: ['admin', 'director', 'accountant', 'itstaff'] },
    { id: 'self_service', label: 'Cổng tự phục vụ & QR', icon: '📱', roles: ['admin', 'director', 'accountant', 'itstaff', 'depthead'] },
    { id: 'devices', label: 'Danh mục thiết bị', icon: '💻', roles: ['admin', 'director', 'accountant', 'itstaff', 'depthead'] },
    { id: 'lifecycle', label: 'Vòng đời thiết bị', icon: '🔄', roles: ['admin', 'accountant', 'itstaff', 'depthead'] },
    { id: 'warranty', label: 'Bảo hành & Hợp đồng', icon: '🛡️', roles: ['admin', 'director', 'accountant', 'itstaff'] },
    { id: 'inventory', label: 'Kho linh kiện & Vật tư', icon: '📦', roles: ['admin', 'accountant', 'itstaff'] },
    { id: 'personnel', label: 'Nhân sự & Phân công', icon: '👨‍⚕️', roles: ['admin', 'director', 'itstaff'] },
    { id: 'users', label: 'Quản lý người dùng', icon: '👥', roles: ['admin'] },
    { id: 'audit', label: 'Nhật ký thao tác', icon: '📜', roles: ['admin', 'director'] },
  ];

  // Filter menu based on user role
  const visibleItems = menuItems.filter(item => 
    !user || item.roles.includes(user.role)
  );

  return (
    <div className="sidebar">
      <div className="sidebar-logo-container" style={{ gap: '10px', paddingBottom: '20px', marginBottom: '20px' }}>
        <Logo width={40} height={40} showGlow={false} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.2px', lineHeight: '1.25', wordBreak: 'break-word' }}>
            Hệ thống quản lý thiết bị CNTT tập trung
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px', marginTop: '3px' }}>PORTAL CNTT</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          {visibleItems.map(item => (
            <li key={item.id}>
              <a 
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="user-badge">
            <div className="user-avatar" style={{ fontSize: '0.9rem' }}>
              👤
            </div>
            <div className="user-info">
              <span className="user-name" style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              <span className="user-role">{user.department || 'Bệnh viện'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
