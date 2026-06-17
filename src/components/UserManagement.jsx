import React, { useState, useEffect } from 'react';

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Bảng điều khiển', icon: '📊' },
  { id: 'reports', label: 'Báo cáo & Thống kê', icon: '📈' },
  { id: 'self_service', label: 'Cổng tự phục vụ & QR', icon: '📱' },
  { id: 'devices', label: 'Danh mục thiết bị', icon: '💻' },
  { id: 'lifecycle', label: 'Vòng đời thiết bị', icon: '🔄' },
  { id: 'warranty', label: 'Bảo hành & Hợp đồng', icon: '🛡️' },
  { id: 'inventory', label: 'Kho linh kiện & Vật tư', icon: '📦' },
  { id: 'personnel', label: 'Nhân sự & Phân công', icon: '👨‍⚕️' },
  { id: 'departments', label: 'Danh mục khoa, phòng', icon: '🏢' },
  { id: 'users', label: 'Quản lý người dùng', icon: '👥' },
  { id: 'audit', label: 'Nhật ký thao tác', icon: '📜' },
];

export default function UserManagement({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Forms
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('itstaff'); // admin, director, accountant, itstaff, depthead
  const [formDept, setFormDept] = useState('');
  const [formPermissions, setFormPermissions] = useState([]);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editPermissions, setEditPermissions] = useState([]);

  const [departments, setDepartments] = useState([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) {
        setUsersList(json.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.success) {
        setDepartments(json.departments);
      }
    } catch (e) {
      console.error('Lỗi tải danh mục khoa phòng:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          username: formUsername,
          password: formPassword,
          role: formRole,
          department: formDept,
          permissions: formPermissions,
          actor_id: user?.id,
          actor_name: user?.name
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Tạo người dùng thành công!');
        setIsAddOpen(false);
        setFormName('');
        setFormUsername('');
        setFormPassword('');
        setFormRole('itstaff');
        setFormDept('');
        setFormPermissions([]);
        fetchUsers();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingUser.id,
        name: editName,
        username: editUsername,
        role: editRole,
        department: editDept,
        permissions: editPermissions,
        actor_id: user?.id,
        actor_name: user?.name
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        alert('Cập nhật tài khoản thành công!');
        setEditingUser(null);
        setEditPassword('');
        fetchUsers();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (targetId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
    try {
      const res = await fetch(`/api/users?id=${targetId}&actor_id=${user?.id}&actor_name=${encodeURIComponent(user?.name)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã xóa người dùng thành công.');
        fetchUsers();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditRole(u.role);
    setEditDept(u.department || '');
    setEditPermissions(u.permissions || []);
  };

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Quản lý Tài khoản & Phân quyền</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Thêm, sửa thông tin, đổi mật khẩu và phân vai trò truy cập hệ thống.</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          ➕ Thêm tài khoản mới
        </button>
      </div>

      <div className="glass-card" style={{ padding: '16px' }}>
        <input 
          type="text" 
          placeholder="Tìm kiếm tài khoản theo họ tên, username..."
          className="form-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách tài khoản...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Tên đăng nhập</th>
                <th>Khoa / Phòng ban</th>
                <th>Vai trò hệ thống</th>
                <th>Quyền truy cập cụ thể</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                    </div>
                  </td>
                  <td><code>{u.username}</code></td>
                  <td>{u.department || '—'}</td>
                  <td>
                    <span className="status-badge active" style={{ 
                      background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'director' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(13, 148, 136, 0.15)',
                      color: u.role === 'admin' ? '#f43f5e' : u.role === 'director' ? '#a5b4fc' : '#2dd4bf'
                    }}>
                      {u.role === 'admin' && 'Quản trị IT'}
                      {u.role === 'director' && 'Ban Giám Đốc'}
                      {u.role === 'accountant' && 'Kế Toán'}
                      {u.role === 'itstaff' && 'Cán bộ IT'}
                      {u.role === 'depthead' && 'Trưởng khoa'}
                    </span>
                  </td>
                  <td>
                    {u.permissions && u.permissions.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '250px' }}>
                        {u.permissions.map(pid => {
                          const perm = AVAILABLE_PERMISSIONS.find(ap => ap.id === pid);
                          return (
                            <span key={pid} style={{ 
                              fontSize: '0.72rem', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'var(--text-secondary)'
                            }} title={perm ? perm.label : pid}>
                              {perm ? `${perm.icon} ${perm.label}` : pid}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Theo vai trò {u.role === 'admin' ? '(Tất cả)' : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEditModal(u)}>
                        ✏️ Sửa
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteUser(u.id)} disabled={u.id === user.id}>
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add User */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '650px', width: '95%' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Thêm tài khoản người dùng mới</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Họ và tên nhân viên *</label>
                <input type="text" required className="form-control" placeholder="Nguyễn Văn A" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập (Username) *</label>
                  <input type="text" required className="form-control" placeholder="nguyenvana" value={formUsername} onChange={e => setFormUsername(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu khởi tạo *</label>
                  <input type="password" required className="form-control" placeholder="Nhập mật khẩu..." value={formPassword} onChange={e => setFormPassword(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Vai trò truy cập</label>
                  <select className="form-control" value={formRole} onChange={e => setFormRole(e.target.value)}>
                    <option value="itstaff">Cán bộ IT (Kỹ thuật viên)</option>
                    <option value="admin">Quản trị viên IT (QTV)</option>
                    <option value="director">Ban Giám Đốc</option>
                    <option value="accountant">Kế toán tài sản</option>
                    <option value="depthead">Trưởng khoa / phòng</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Khoa / Phòng làm việc</label>
                  <select className="form-control" value={formDept} onChange={e => setFormDept(e.target.value)}>
                    <option value="">-- Chọn khoa/phòng --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Phân quyền chức năng cụ thể
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    (Nếu không chọn, hệ thống sẽ sử dụng quyền mặc định của vai trò)
                  </span>
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: '10px', 
                  maxHeight: '160px', 
                  overflowY: 'auto', 
                  padding: '12px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' 
                }}>
                  {AVAILABLE_PERMISSIONS.map(p => {
                    const checked = formPermissions.includes(p.id);
                    return (
                      <label 
                        key={p.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: checked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: `1px solid ${checked ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                          transition: 'all 0.2s ease',
                          fontSize: '0.85rem'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormPermissions([...formPermissions, p.id]);
                            } else {
                              setFormPermissions(formPermissions.filter(id => id !== p.id));
                            }
                          }}
                          style={{
                            accentColor: 'var(--accent-primary, #6366f1)',
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                        <span>{p.icon} {p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu tài khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '650px', width: '95%' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Chỉnh sửa thông tin tài khoản</h3>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label className="form-label">Họ và tên nhân viên *</label>
                <input type="text" required className="form-control" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập (Username) *</label>
                  <input type="text" required className="form-control" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu mới (Để trống nếu giữ nguyên)</label>
                  <input type="password" className="form-control" placeholder="Nhập mật khẩu mới..." value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Vai trò truy cập</label>
                  <select className="form-control" value={editRole} onChange={e => setEditRole(e.target.value)}>
                    <option value="itstaff">Cán bộ IT (Kỹ thuật viên)</option>
                    <option value="admin">Quản trị viên IT (QTV)</option>
                    <option value="director">Ban Giám Đốc</option>
                    <option value="accountant">Kế toán tài sản</option>
                    <option value="depthead">Trưởng khoa / phòng</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Khoa / Phòng làm việc</label>
                  <select className="form-control" value={editDept} onChange={e => setEditDept(e.target.value)}>
                    <option value="">-- Chọn khoa/phòng --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Phân quyền chức năng cụ thể
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    (Nếu không chọn, hệ thống sẽ sử dụng quyền mặc định của vai trò)
                  </span>
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: '10px', 
                  maxHeight: '160px', 
                  overflowY: 'auto', 
                  padding: '12px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' 
                }}>
                  {AVAILABLE_PERMISSIONS.map(p => {
                    const checked = editPermissions.includes(p.id);
                    return (
                      <label 
                        key={p.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: checked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: `1px solid ${checked ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                          transition: 'all 0.2s ease',
                          fontSize: '0.85rem'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditPermissions([...editPermissions, p.id]);
                            } else {
                              setEditPermissions(editPermissions.filter(id => id !== p.id));
                            }
                          }}
                          style={{
                            accentColor: 'var(--accent-primary, #6366f1)',
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                        <span>{p.icon} {p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
