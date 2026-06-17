import React, { useState, useEffect } from 'react';

export default function Inventory({ user }) {
  const [consumables, setConsumables] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importItem, setImportItem] = useState(null);
  const [exportItem, setExportItem] = useState(null);

  // Forms
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('ram'); // ram, ssd, hdd, ink, paper, power, cable, other
  const [formQty, setFormQty] = useState('10');
  const [formMinQty, setFormMinQty] = useState('5');
  const [formUnit, setFormUnit] = useState('Cái');
  const [formPrice, setFormPrice] = useState('');

  // Import stock Form
  const [importQty, setImportQty] = useState('10');
  const [importPrice, setImportPrice] = useState('');

  // Export stock Form
  const [exportQty, setExportQty] = useState('1');
  const [exportDept, setExportDept] = useState('');
  const [exportNotes, setExportNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (json.success) {
        setConsumables(json.consumables);
        setLogs(json.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateConsumable = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          quantity: formQty,
          min_qty: formMinQty,
          unit: formUnit,
          price: formPrice ? parseFloat(formPrice) : 0,
          user_id: user?.id,
          username: user?.username,
          action_type: 'create'
        })
      });
      
      let json;
      try {
        json = await res.json();
      } catch (err) {
        throw new Error(`Phản hồi máy chủ không hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        alert('Tạo danh mục linh kiện thành công!');
        setIsAddOpen(false);
        setFormName('');
        setFormPrice('');
        loadData();
      } else {
        alert('Lỗi: ' + (json.message || json.error || 'Yêu cầu thất bại'));
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleImportStock = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: importItem.id,
          quantity: importQty,
          price: importPrice ? parseFloat(importPrice) : importItem.price,
          user_id: user?.id,
          username: user?.username,
          action_type: 'import'
        })
      });

      let json;
      try {
        json = await res.json();
      } catch (err) {
        throw new Error(`Phản hồi máy chủ không hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        alert('Nhập kho bổ sung linh kiện thành công!');
        setImportItem(null);
        setImportQty('10');
        setImportPrice('');
        loadData();
      } else {
        alert('Lỗi: ' + (json.message || json.error || 'Yêu cầu thất bại'));
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleExportStock = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: exportItem.id,
          quantity: exportQty,
          department: exportDept,
          notes: exportNotes,
          user_id: user?.id,
          username: user?.username,
          action_type: 'export'
        })
      });

      let json;
      try {
        json = await res.json();
      } catch (err) {
        throw new Error(`Phản hồi máy chủ không hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        alert('Xuất kho linh kiện về khoa/phòng thành công!');
        setExportItem(null);
        setExportQty('1');
        setExportDept('');
        setExportNotes('');
        loadData();
      } else {
        alert('Lỗi: ' + (json.message || json.error || 'Yêu cầu thất bại'));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteConsumable = async (targetId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa loại linh kiện này? Mọi lịch sử xuất nhập liên quan sẽ bị xóa!')) return;
    try {
      const res = await fetch(`/api/inventory?id=${targetId}&user_id=${user?.id}&username=${encodeURIComponent(user?.username || '')}`, {
        method: 'DELETE'
      });

      let json;
      try {
        json = await res.json();
      } catch (err) {
        throw new Error(`Phản hồi máy chủ không hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        alert('Xóa linh kiện thành công!');
        loadData();
      } else {
        alert('Lỗi: ' + (json.message || json.error || 'Yêu cầu thất bại'));
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Kho Linh kiện và Vật tư Tiêu hao</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Theo dõi mức tồn kho linh kiện thay thế (RAM, SSD...) và vật tư (mực in, giấy...) dự phòng.</p>
        </div>

        {['admin', 'itstaff', 'accountant'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            ➕ Thêm loại linh kiện mới
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách kho...</div>
      ) : (
        <div className="dashboard-grid">
          {/* Left Side: Consumables grid list */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tình trạng tồn kho</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {consumables.map(item => {
                const isLow = item.current_qty <= item.min_qty;
                return (
                  <div 
                    key={item.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(0,0,0,0.15)', 
                      borderColor: isLow ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)',
                      boxShadow: isLow ? '0 0 10px rgba(239, 68, 68, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="user-role" style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>{item.type}</span>
                      {isLow && <span className="status-badge broken" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Hụt kho</span>}
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0', minHeight: '40px' }}>{item.name}</h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Đơn giá:</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Intl.NumberFormat('vi-VN').format(item.price)} đ</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tồn / Tối thiểu:</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isLow ? 'var(--status-broken)' : 'white' }}>
                          {item.current_qty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {item.min_qty} {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    {['admin', 'itstaff'].includes(user?.role) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '6px 6px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setImportItem(item);
                              setImportPrice(item.price);
                            }}
                          >
                            📥 Nhập kho
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '6px 6px', fontSize: '0.75rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                            onClick={() => {
                              setExportItem(item);
                              setExportQty('1');
                              setExportDept('');
                              setExportNotes('');
                            }}
                          >
                            📤 Xuất khoa
                          </button>
                        </div>
                        <button 
                          className="btn btn-danger" 
                          style={{ 
                            width: '100%', 
                            padding: '6px 6px', 
                            fontSize: '0.75rem', 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#f43f5e', 
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => handleDeleteConsumable(item.id)}
                        >
                          🗑️ Xóa linh kiện
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Log History */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nhật ký Xuất - Nhập vật tư</h3>
            
            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Linh kiện</th>
                    <th>Hành động</th>
                    <th>SL</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.consumable_name}</td>
                      <td>
                        <span className={`status-badge ${log.type === 'import' ? 'active' : 'broken'}`}>
                          {log.type === 'import' ? 'Nhập kho' : 'Xuất kho'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{log.quantity}</td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {log.notes}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(log.action_date).toLocaleString('vi-VN')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Consumable */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Khởi tạo danh mục vật tư/linh kiện mới</h3>
            <form onSubmit={handleCreateConsumable}>
              <div className="form-group">
                <label className="form-label">Tên vật tư/linh kiện *</label>
                <input type="text" required className="form-control" placeholder="RAM Kingston DDR4 16GB" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Loại vật tư</label>
                <select className="form-control" value={formType} onChange={e => setFormType(e.target.value)}>
                  <option value="ram">RAM</option>
                  <option value="ssd">Ổ cứng SSD</option>
                  <option value="hdd">Ổ cứng HDD</option>
                  <option value="ink">Mực in</option>
                  <option value="paper">Giấy in</option>
                  <option value="power">Nguồn máy tính</option>
                  <option value="cable">Dây cáp mạng</option>
                  <option value="other">Loại khác</option>
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Đơn vị tính</label>
                  <input type="text" className="form-control" value={formUnit} onChange={e => setFormUnit(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn giá mua (VNĐ)</label>
                  <input type="number" required className="form-control" placeholder="850000" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Số lượng nhập ban đầu</label>
                  <input type="number" className="form-control" value={formQty} onChange={e => setFormQty(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngưỡng cảnh báo tối thiểu</label>
                  <input type="number" className="form-control" value={formMinQty} onChange={e => setFormMinQty(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Stock */}
      {importItem && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.15rem', fontWeight: 700 }}>Nhập thêm linh kiện vào kho</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>Linh kiện: <strong>{importItem.name}</strong></p>
            
            <form onSubmit={handleImportStock}>
              <div className="form-group">
                <label className="form-label">Số lượng nhập thêm ({importItem.unit}) *</label>
                <input type="number" required min="1" className="form-control" value={importQty} onChange={e => setImportQty(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Đơn giá nhập đợt này (VNĐ) *</label>
                <input type="number" required className="form-control" value={importPrice} onChange={e => setImportPrice(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setImportItem(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận nhập kho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Export Stock */}
      {exportItem && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.15rem', fontWeight: 700 }}>Xuất linh kiện/vật tư sử dụng</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>Linh kiện: <strong>{exportItem.name}</strong> (Tồn kho: {exportItem.current_qty} {exportItem.unit})</p>
            
            <form onSubmit={handleExportStock}>
              <div className="form-group">
                <label className="form-label">Đến Khoa / Phòng nhận *</label>
                <input type="text" required className="form-control" placeholder="Khoa Cấp Cứu / Khoa Nội..." value={exportDept} onChange={e => setExportDept(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Số lượng xuất ({exportItem.unit}) *</label>
                <input type="number" required min="1" max={exportItem.current_qty} className="form-control" value={exportQty} onChange={e => setExportQty(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú xuất kho</label>
                <textarea className="form-control" rows="2" placeholder="Bàn giao trực tiếp cho Trưởng khoa / Thay thế bổ sung..." value={exportNotes} onChange={e => setExportNotes(e.target.value)}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setExportItem(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận xuất kho</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
