import React, { useState, useEffect } from 'react';

export default function WarrantyContracts({ user }) {
  const [devices, setDevices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('warranty'); // warranty, contracts

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  // Form states
  const [formNumber, setFormNumber] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formService, setFormService] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formContact, setFormContact] = useState('');

  const fetchDevicesAndContracts = async () => {
    try {
      setLoading(true);
      // Fetch devices
      const devRes = await fetch('/api/devices');
      const devJson = await devRes.json();
      if (devJson.success) {
        setDevices(devJson.devices);
      }

      // Fetch contracts
      const conRes = await fetch('/api/contracts');
      const conJson = await conRes.json();
      if (conJson.success) {
        setContracts(conJson.contracts);
      }
    } catch (err) {
      console.error('Lỗi tải thông tin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesAndContracts();
  }, []);

  const getDaysRemaining = (endDateStr) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWarrantyStatus = (device) => {
    if (!device.warranty_end) return { text: 'N/A', class: 'liquidated' };
    const days = getDaysRemaining(device.warranty_end);
    if (days < 0) return { text: `Đã hết hạn (${Math.abs(days)} ngày trước)`, class: 'broken', style: { color: 'var(--status-broken)' } };
    if (days <= 30) return { text: `Sắp hết hạn (${days} ngày)`, class: 'maintenance', style: { color: 'var(--status-maintenance)' } };
    return { text: `Còn hạn (${days} ngày)`, class: 'active', style: { color: 'var(--status-active)' } };
  };

  const handleOpenAdd = () => {
    setEditingContract(null);
    setFormNumber('');
    setFormSupplier('');
    setFormService('');
    setFormValue('');
    setFormStartDate('');
    setFormEndDate('');
    setFormContact('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contract) => {
    setEditingContract(contract);
    setFormNumber(contract.contract_number);
    setFormSupplier(contract.supplier);
    setFormService(contract.service || '');
    setFormValue(contract.value || '');
    setFormStartDate(contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '');
    setFormEndDate(contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '');
    setFormContact(contract.contact || '');
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    if (!formNumber || !formSupplier) {
      alert('Vui lòng nhập đầy đủ Số hợp đồng và Nhà cung cấp.');
      return;
    }

    const payload = {
      contract_number: formNumber,
      supplier: formSupplier,
      service: formService,
      value: formValue ? parseFloat(formValue) : 0,
      start_date: formStartDate || null,
      end_date: formEndDate || null,
      contact: formContact,
      user_id: user?.id,
      username: user?.username
    };

    try {
      let res;
      if (editingContract) {
        payload.id = editingContract.id;
        res = await fetch('/api/contracts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchDevicesAndContracts();
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối lưu hợp đồng: ' + err.message);
    }
  };

  const handleDeleteContract = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hợp đồng dịch vụ bảo trì này không? Thao tác này sẽ ghi nhận vào nhật ký hệ thống.')) return;
    try {
      const res = await fetch(`/api/contracts?id=${id}&user_id=${user?.id || ''}&username=${user?.username || ''}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchDevicesAndContracts();
      } else {
        alert('Lỗi: ' + (json.message || json.error));
      }
    } catch (err) {
      alert('Lỗi kết nối xóa hợp đồng: ' + err.message);
    }
  };

  const isEditor = ['admin', 'accountant', 'itstaff'].includes(user?.role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Quản lý Bảo hành và Hợp đồng</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Giám sát thời hạn bảo hành của thiết bị y tế và hợp đồng dịch vụ kỹ thuật với đối tác bên ngoài.</p>
        </div>
        
        {activeTab === 'contracts' && isEditor && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ Thêm hợp đồng bảo trì
          </button>
        )}
      </div>

      {/* Tabs select */}
      <div className="glass-card" style={{ display: 'flex', gap: '10px', padding: '10px' }}>
        <button className={`btn ${activeTab === 'warranty' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('warranty')}>
          🛡️ Bảo hành Thiết bị
        </button>
        <button className={`btn ${activeTab === 'contracts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('contracts')}>
          📄 Hợp đồng Bảo trì Bên ngoài
        </button>
      </div>

      {/* Tables content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải thông tin...</div>
      ) : activeTab === 'warranty' ? (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Trạng thái bảo hành linh kiện thiết bị</h3>
          
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã TS</th>
                  <th>Tên thiết bị</th>
                  <th>Nhà cung cấp</th>
                  <th>Ngày mua</th>
                  <th>Hạn bảo hành</th>
                  <th>Trạng thái bảo hành</th>
                </tr>
              </thead>
              <tbody>
                {devices.filter(d => d.status !== 'liquidated').map(d => {
                  const statusInfo = getWarrantyStatus(d);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{d.asset_code}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Model: {d.model}</div>
                      </td>
                      <td>{d.supplier || 'N/A'}</td>
                      <td>{d.purchase_date ? new Date(d.purchase_date).toLocaleDateString('vi-VN') : 'N/A'}</td>
                      <td>{d.warranty_end ? new Date(d.warranty_end).toLocaleDateString('vi-VN') : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${statusInfo.class}`} style={statusInfo.style}>
                          {statusInfo.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Hợp đồng bảo trì hệ thống hạ tầng y tế</h3>
          
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Số hợp đồng</th>
                  <th>Nhà cung cấp dịch vụ</th>
                  <th>Dịch vụ bảo trì hỗ trợ</th>
                  <th>Giá trị hợp đồng</th>
                  <th>Thời hạn</th>
                  <th>Cảnh báo hợp đồng</th>
                  {isEditor && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={isEditor ? "7" : "6"} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      Chưa ghi nhận hợp đồng bảo trì nào.
                    </td>
                  </tr>
                ) : (
                  contracts.map(c => {
                    const days = getDaysRemaining(c.end_date);
                    let badgeClass = 'active';
                    let badgeText = `Còn hạn (${days} ngày)`;
                    if (days < 0) {
                      badgeClass = 'broken';
                      badgeText = `Đã hết hạn (${Math.abs(days)} ngày trước)`;
                    } else if (days <= 30) {
                      badgeClass = 'maintenance';
                      badgeText = `Sắp hết hạn (${days} ngày)`;
                    }

                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{c.contract_number}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.supplier}</div>
                          {c.contact && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hotline: {c.contact}</div>}
                        </td>
                        <td>{c.service}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.value)}</td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>Từ: {c.start_date ? new Date(c.start_date).toLocaleDateString('vi-VN') : '—'}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đến: {c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : '—'}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </td>
                        {isEditor && (
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleOpenEdit(c)}
                              >
                                ✏️ Sửa
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleDeleteContract(c.id)}
                              >
                                🗑️ Xóa
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Contract Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>
              {editingContract ? `Sửa hợp đồng: ${editingContract.contract_number}` : 'Thêm hợp đồng bảo trì mới'}
            </h3>
            
            <form onSubmit={handleSaveContract}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Số hợp đồng *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="HD-BT-2026-001" 
                    value={formNumber} 
                    onChange={e => setFormNumber(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nhà cung cấp dịch vụ *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="FPT / Viettel / CMC" 
                    value={formSupplier} 
                    onChange={e => setFormSupplier(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nội dung dịch vụ bảo trì hỗ trợ</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  placeholder="Mô tả cụ thể gói dịch vụ, phần mềm bảo trì..." 
                  value={formService} 
                  onChange={e => setFormService(e.target.value)} 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Giá trị hợp đồng (VNĐ)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="100000000" 
                    value={formValue} 
                    onChange={e => setFormValue(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Thông tin liên hệ (Hotline/SĐT)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="024 xxxx / 1900 xxxx" 
                    value={formContact} 
                    onChange={e => setFormContact(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu hiệu lực</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formStartDate} 
                    onChange={e => setFormStartDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hết hạn hợp đồng</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formEndDate} 
                    onChange={e => setFormEndDate(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu hợp đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
