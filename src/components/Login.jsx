import React, { useState } from 'react';
import Logo from './Logo';

export default function Login({ onLoginSuccess, theme, onToggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Lỗi đăng nhập');
      }
    } catch (err) {
      setError('Lỗi máy chủ kết nối DB: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ position: 'relative' }}>
      <button 
        onClick={onToggleTheme} 
        className="btn btn-secondary" 
        style={{ 
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '8px', 
          borderRadius: '50%', 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '1.2rem',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          cursor: 'pointer',
          zIndex: 10
        }}
        title={theme === 'light' ? 'Chuyển sang Chế độ tối' : 'Chuyển sang Chế độ sáng'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="glass-card login-card" style={{ display: 'flex', flexDirection: 'column', padding: '35px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)' }}>
        <div className="login-logo" style={{ marginBottom: '24px' }}>
          <Logo width={85} height={85} />
          <div>
            <h2 className="login-title" style={{ fontSize: '1.25rem', marginTop: '12px', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1.3' }}>
              Hệ thống quản lý thiết bị CNTT tập trung
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '4px' }}>Trung tâm Y tế khu vực Liên Chiểu</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent-pink)', fontWeight: 600, fontStyle: 'italic', marginTop: '4px' }}>"Số hóa quy trình - Tối ưu hiệu năng - Kiến tạo y tế thông minh"</div>
          </div>
        </div>

        {error && (
          <div className="alert-banner danger" style={{ marginBottom: '18px', padding: '10px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tên đăng nhập</label>
            <input 
              type="text" 
              required 
              className="form-control" 
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mật khẩu</label>
            <input 
              type="password" 
              required 
              className="form-control" 
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', height: '45px' }} disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          @2026 Trung tâm Y tế khu vực Liên Chiểu - Ứng dụng được nghiên cứu và phát triển bởi tổ CNTT
        </div>
      </div>
    </div>
  );
}
