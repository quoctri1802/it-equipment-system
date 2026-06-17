import React from 'react';
import Logo from './Logo';

export default function Header({ user, onLogout, theme, onToggleTheme, onToggleSidebar }) {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          className="mobile-menu-toggle" 
          onClick={onToggleSidebar}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.6rem',
            cursor: 'pointer',
            padding: '4px',
            marginRight: '8px'
          }}
          title="Mở menu"
        >
          ☰
        </button>
        <Logo width={46} height={46} />

        <div>
          <h1 className="brand-title" style={{ fontSize: '1.2rem' }}>Trung tâm Y tế khu vực Liên Chiểu</h1>
          <p className="brand-subtitle" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Hệ thống quản lý thiết bị CNTT</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, borderLeft: '1px solid var(--border-color)', paddingLeft: '10px', fontStyle: 'italic', letterSpacing: '0.5px' }}>
              "Số hóa quy trình - Tối ưu hiệu năng - Kiến tạo y tế thông minh"
            </span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button 
          onClick={onToggleTheme} 
          className="btn btn-secondary" 
          style={{ 
            padding: '8px', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.2rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            cursor: 'pointer'
          }}
          title={theme === 'light' ? 'Chuyển sang Chế độ tối' : 'Chuyển sang Chế độ sáng'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="user-name">{user.name}</div>
                <div className="user-role" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {user.role === 'admin' && 'Quản trị viên'}
                  {user.role === 'director' && 'Ban Giám Đốc'}
                  {user.role === 'accountant' && 'Kế toán tài sản'}
                  {user.role === 'itstaff' && 'Cán bộ kỹ thuật IT'}
                  {user.role === 'depthead' && `Trưởng khoa (${user.department})`}
                </div>
              </div>
            </div>
            
            <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </header>
  );
}
