import React, { useState, useEffect } from 'react';

export default function Departments({ user }) {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // Edit States
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/departments');
      const json = await res.json();
      if (json.success) {
        setDepts(json.departments);
      }
    } catch (e) {
      console.error('Lỗi tải danh mục khoa phòng:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng điền tên khoa/phòng.');
      return;
    }
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Tạo khoa/phòng mới thành công!');
        setIsAddOpen(false);
        setFormName('');
        setFormDesc('');
        fetchDepts();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert('Lỗi mạng: ' + err.message);
    }
  };

  const handleEditDept = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Tên khoa/phòng không được để trống.');
      return;
    }
    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDept.id,
          name: editName,
          description: editDesc,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Cập nhật thông tin khoa/phòng thành công!');
        setEditingDept(null);
        fetchDepts();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert('Lỗi mạng: ' + err.message);
    }
  };

  const handleDeleteDept = async (dept) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa khoa/phòng "${dept.name}"?\n` + 
      `- Các thiết bị thuộc khoa này sẽ tự động chuyển về "Kho thiết bị".\n` + 
      `- Nhân sự thuộc khoa này sẽ chuyển về "Chưa phân bổ".\n` + 
      `Hành động này không thể hoàn tác.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/departments?id=${dept.id}&actor_id=${user?.id || ''}&actor_name=${encodeURIComponent(user?.name || '')}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã xóa khoa/phòng thành công.');
        fetchDepts();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (e) {
      alert('Lỗi mạng: ' + e.message);
    }
  };

  const openEditModal = (d) => {
    setEditingDept(d);
    setEditName(d.name);
    setEditDesc(d.description || '');
  };

  const filteredDepts = depts.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Danh mục Khoa / Phòng ban</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Khai báo và quản lý các khoa, phòng chức năng trong bệnh viện.</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            🏢 Thêm khoa/phòng mới
          </button>
        )}
      </div>

      <div className="glass-card" style={{ padding: '16px' }}>
        <input 
          type="text" 
          placeholder="Tìm kiếm khoa phòng theo tên, mô tả..."
          className="form-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh mục khoa phòng...</div>
      ) : filteredDepts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Không tìm thấy khoa phòng nào phù hợp.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tên Khoa / Phòng ban</th>
                <th>Mô tả</th>
                <th>Số lượng thiết bị</th>
                {isAdmin && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDepts.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.82rem', background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)' }}>
                        🏢
                      </div>
                      <div style={{ fontWeight: 700 }}>{d.name}</div>
                    </div>
                  </td>
                  <td>{d.description || '—'}</td>
                  <td>
                    <span className="status-badge instock" style={{ fontWeight: 700 }}>
                      {d.device_count} Thiết bị
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEditModal(d)}>
                          ✏️ Sửa
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteDept(d)} disabled={d.name === 'Kho thiết bị' || d.name === 'Phòng CNTT'}>
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Department */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Thêm khoa/phòng mới</h3>
            <form onSubmit={handleCreateDept}>
              <div className="form-group">
                <label className="form-label">Tên Khoa / Phòng ban *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  placeholder="VD: Khoa Ngoại Chấn Thương" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả / Chức năng</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  placeholder="Nhập mô tả hoặc vị trí khoa phòng..." 
                  value={formDesc} 
                  onChange={e => setFormDesc(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Department */}
      {editingDept && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Chỉnh sửa thông tin khoa/phòng</h3>
            <form onSubmit={handleEditDept}>
              <div className="form-group">
                <label className="form-label">Tên Khoa / Phòng ban *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả / Chức năng</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingDept(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
