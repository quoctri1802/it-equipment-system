import React, { useState, useEffect } from 'react';

export default function Personnel({ user }) {
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAsgModalOpen, setIsAsgModalOpen] = useState(false);

  // Selected item for edits
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingAsg, setEditingAsg] = useState(null);

  // Staff Form States
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('itstaff');
  const [staffDept, setStaffDept] = useState('Phòng CNTT');

  // Assignment Form States
  const [asgDeviceId, setAsgDeviceId] = useState('');
  const [asgAssigneeId, setAsgAssigneeId] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgPriority, setAsgPriority] = useState('medium');
  const [asgStatus, setAsgStatus] = useState('processing');
  const [asgNotes, setAsgNotes] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch staff & assignments
      const res = await fetch('/api/personnel');
      const json = await res.json();
      if (json.success) {
        setStaff(json.staff);
        setAssignments(json.assignments);
      }

      // Fetch devices (for assignment dropdown)
      const devRes = await fetch('/api/devices');
      const devJson = await devRes.json();
      if (devJson.success) {
        setDevices(devJson.devices);
      }
    } catch (err) {
      console.error('Lỗi tải thông tin nhân sự/phân công:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // STAFF CRUD HANDLERS
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffUsername('');
    setStaffPassword('');
    setStaffRole('itstaff');
    setStaffDept('Phòng CNTT');
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (person) => {
    setEditingStaff(person);
    setStaffName(person.name);
    setStaffUsername(person.username);
    setStaffPassword(''); // keep blank unless change
    setStaffRole(person.role);
    setStaffDept(person.department || 'Phòng CNTT');
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffUsername) {
      alert('Vui lòng nhập đầy đủ Tên và Tên đăng nhập.');
      return;
    }
    if (!editingStaff && !staffPassword) {
      alert('Vui lòng nhập mật khẩu cho tài khoản mới.');
      return;
    }

    const payload = {
      name: staffName,
      username: staffUsername,
      role: staffRole,
      department: staffDept,
      actor_id: user?.id,
      actor_name: user?.name
    };
    if (staffPassword) {
      payload.password = staffPassword;
    }

    try {
      let res;
      if (editingStaff) {
        payload.id = editingStaff.id;
        res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (json.success) {
        setIsStaffModalOpen(false);
        fetchAllData();
        alert(editingStaff ? 'Cập nhật nhân sự thành công!' : 'Thêm nhân sự mới thành công!');
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối lưu nhân sự: ' + err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này không? Việc này sẽ xóa tài khoản truy cập và ghi lại trong nhật ký.')) return;
    try {
      const res = await fetch(`/api/users?id=${id}&actor_id=${user?.id || ''}&actor_name=${user?.username || ''}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
        alert('Xóa nhân sự thành công!');
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối xóa nhân sự: ' + err.message);
    }
  };

  // ASSIGNMENT CRUD HANDLERS
  const handleOpenAddAsg = () => {
    setEditingAsg(null);
    setAsgDeviceId('');
    setAsgAssigneeId('');
    setAsgTitle('');
    setAsgDesc('');
    setAsgPriority('medium');
    setAsgStatus('processing');
    setAsgNotes('');
    setIsAsgModalOpen(true);
  };

  const handleOpenEditAsg = (asg) => {
    setEditingAsg(asg);
    setAsgDeviceId(asg.device_id || '');
    setAsgAssigneeId(asg.assignee_id || '');
    setAsgTitle(asg.title);
    setAsgDesc(asg.description || '');
    setAsgPriority(asg.priority || 'medium');
    setAsgStatus(asg.status || 'processing');
    setAsgNotes(asg.notes || '');
    setIsAsgModalOpen(true);
  };

  const handleSaveAsg = async (e) => {
    e.preventDefault();
    if (!asgDeviceId || !asgAssigneeId || !asgTitle) {
      alert('Vui lòng chọn Thiết bị, Kỹ thuật viên phụ trách và nhập Tiêu đề công việc.');
      return;
    }

    const payload = {
      device_id: asgDeviceId,
      assignee_id: asgAssigneeId,
      title: asgTitle,
      description: asgDesc,
      priority: asgPriority,
      status: asgStatus,
      notes: asgNotes,
      actor_id: user?.id,
      actor_name: user?.name
    };

    try {
      let res;
      if (editingAsg) {
        payload.id = editingAsg.id;
        res = await fetch('/api/personnel', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/personnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (json.success) {
        setIsAsgModalOpen(false);
        fetchAllData();
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối phân công: ' + err.message);
    }
  };

  const handleDeleteAsg = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phân công công việc này không?')) return;
    try {
      const res = await fetch(`/api/personnel?id=${id}&actor_id=${user?.id || ''}&actor_name=${user?.username || ''}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối xóa phân công: ' + err.message);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isItStaff = user?.role === 'itstaff';
  const isAsgEditor = isAdmin || isItStaff;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Quản lý Nhân sự & Phân công</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Danh sách nhân viên phòng CNTT và phân công xử lý sửa chữa thiết bị tại bệnh viện.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAsgEditor && (
            <button className="btn btn-primary" onClick={handleOpenAddAsg}>
              ➕ Tạo phân công công việc
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-secondary" onClick={handleOpenAddStaff} style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
              👨‍⚕️ Thêm nhân sự IT
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải thông tin nhân sự...</div>
      ) : (
        <div className="dashboard-grid">
          
          {/* LEFT: STAFF DIRECTORY */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Đội ngũ cán bộ kỹ thuật CNTT</h3>
            
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Đang sửa</th>
                    <th>Đã hoàn thành</th>
                    {isAdmin && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(person => (
                    <tr key={person.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{person.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{person.department}</div>
                          </div>
                        </div>
                      </td>
                      <td><code>{person.username}</code></td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {person.role === 'admin' ? 'Quản trị viên' : 'Kỹ thuật viên'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--status-maintenance)' }}>{person.processing_count}</td>
                      <td style={{ fontWeight: 600, color: 'var(--status-active)' }}>{person.resolved_count}</td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleOpenEditStaff(person)}
                            >
                              Sửa
                            </button>
                            {/* Prevent deleting oneself */}
                            {user.id !== person.id && (
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => handleDeleteStaff(person.id)}
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: ASSIGNMENT LOGS */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lịch sử giao việc sửa chữa sự cố</h3>
            
            <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>IT phụ trách</th>
                    <th>Chi tiết công việc</th>
                    <th>Trạng thái</th>
                    {isAsgEditor && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={isAsgEditor ? "4" : "3"} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                        Chưa ghi nhận lịch sử xử lý.
                      </td>
                    </tr>
                  ) : (
                    assignments.map(asg => (
                      <tr key={asg.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{asg.assignee_name || 'Chưa rõ'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(asg.reported_date).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{asg.asset_code}</div>
                          <div style={{ fontWeight: 600 }}>{asg.title}</div>
                          {asg.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{asg.description}</div>}
                          {asg.notes && <div style={{ fontSize: '0.7rem', color: 'var(--status-maintenance)', marginTop: '4px', fontStyle: 'italic' }}>Ghi chú: {asg.notes}</div>}
                        </td>
                        <td>
                          <span className={`status-badge ${asg.status}`}>
                            {asg.status === 'reported' && 'Mới báo'}
                            {asg.status === 'processing' && 'Đang sửa'}
                            {asg.status === 'resolved' && 'Xong'}
                          </span>
                        </td>
                        {isAsgEditor && (
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => handleOpenEditAsg(asg)}
                              >
                                Sửa
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => handleDeleteAsg(asg.id)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: ADD/EDIT STAFF */}
      {isStaffModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>
              {editingStaff ? `Sửa thông tin: ${editingStaff.name}` : 'Thêm nhân sự IT mới'}
            </h3>
            
            <form onSubmit={handleSaveStaff}>
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  placeholder="Nguyễn Văn A" 
                  value={staffName} 
                  onChange={e => setStaffName(e.target.value)} 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="nguyenvana" 
                    disabled={!!editingStaff} // disable username edit for safety
                    value={staffUsername} 
                    onChange={e => setStaffUsername(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu {editingStaff && '(Chỉ nhập nếu muốn đổi)'} *</label>
                  <input 
                    type="password" 
                    required={!editingStaff} 
                    className="form-control" 
                    placeholder="••••••••" 
                    value={staffPassword} 
                    onChange={e => setStaffPassword(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vai trò</label>
                  <select 
                    className="form-control" 
                    value={staffRole} 
                    onChange={e => setStaffRole(e.target.value)}
                  >
                    <option value="itstaff">Kỹ thuật viên IT</option>
                    <option value="admin">Quản trị viên IT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Khoa / Phòng ban</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={staffDept} 
                    onChange={e => setStaffDept(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsStaffModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu nhân sự</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT ASSIGNMENT */}
      {isAsgModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>
              {editingAsg ? `Sửa phân công công việc` : 'Tạo phân công sửa chữa sự cố mới'}
            </h3>
            
            <form onSubmit={handleSaveAsg}>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Thiết bị liên quan *</label>
                  <select 
                    className="form-control" 
                    required
                    disabled={!!editingAsg} // cannot change device after assigned
                    value={asgDeviceId} 
                    onChange={e => setAsgDeviceId(e.target.value)}
                  >
                    <option value="">-- Chọn thiết bị sự cố --</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.asset_code} - {d.name} ({d.location})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">IT Kỹ thuật phụ trách *</label>
                  <select 
                    className="form-control" 
                    required
                    value={asgAssigneeId} 
                    onChange={e => setAsgAssigneeId(e.target.value)}
                  >
                    <option value="">-- Chọn kỹ thuật viên IT --</option>
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role === 'admin' ? 'QTV' : 'KTV'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề phân công công việc *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  placeholder="VD: Cài đặt phần mềm PACS bệnh viện" 
                  value={asgTitle} 
                  onChange={e => setAsgTitle(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả chi tiết nội dung sự cố/yêu cầu</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  placeholder="Nhập ghi chú kỹ thuật, chuẩn đoán lỗi sơ bộ..." 
                  value={asgDesc} 
                  onChange={e => setAsgDesc(e.target.value)} 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Mức độ ưu tiên</label>
                  <select 
                    className="form-control" 
                    value={asgPriority} 
                    onChange={e => setAsgPriority(e.target.value)}
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Khẩn cấp</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái xử lý sự cố</label>
                  <select 
                    className="form-control" 
                    value={asgStatus} 
                    onChange={e => setAsgStatus(e.target.value)}
                  >
                    <option value="reported">Mới báo (Chưa sửa)</option>
                    <option value="processing">Đang tiến hành bảo trì/sửa chữa</option>
                    <option value="resolved">Đã hoàn tất khắc phục sự cố</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú tiến độ / Phụ tùng thay thế</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Lắp đặt RAM 8GB Kingston mới, đang test độ ổn định..." 
                  value={asgNotes} 
                  onChange={e => setAsgNotes(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAsgModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu phân công</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
