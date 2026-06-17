import React, { useState, useEffect } from 'react';

const CHECKLIST_PRESETS = {
  pc: [
    "Thổi bụi sạch bo mạch & vệ sinh quạt tản nhiệt CPU",
    "Kiểm tra nhiệt độ CPU & chỉ số sức khỏe ổ cứng (S.M.A.R.T)",
    "Chạy quét dọn tệp rác hệ thống & tối ưu hóa Windows",
    "Kiểm tra cập nhật phần mềm diệt virus và chạy quét nhanh"
  ],
  server: [
    "Vệ sinh bụi bẩn tủ Rack, quạt thông gió & màng chắn",
    "Kiểm tra cảnh báo lỗi đèn LED vật lý trên máy chủ",
    "Kiểm tra trạng thái cấu hình mảng RAID & đĩa cứng dự phòng",
    "Kiểm tra tệp backup DB hàng ngày & kiểm tra nhật ký lỗi HIS"
  ],
  printer: [
    "Vệ sinh gương quét quang học & khay nạp giấy",
    "Kiểm tra tình trạng hao mòn quả lô sấy & trục bám",
    "Lau sạch đầu kim phun mực hoặc trục từ cartridge",
    "In bản kiểm tra căn lề màu & độ sắc nét ký tự"
  ],
  network: [
    "Vệ sinh sạch sẽ cổng cắm mạng, cáp mạng RJ45/SFP",
    "Kiểm tra hiệu suất tải RAM/CPU trên thiết bị Switch Core",
    "Sao lưu file cấu hình hiện tại của Router & Switch phòng máy",
    "Kiểm tra và cài đặt bản vá Firmware bảo mật nhà sản xuất"
  ]
};

export default function DeviceLifecycle({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('transfer'); // transfer, incident, maintenance, liquidate
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenancePlans, setMaintenancePlans] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filter for maintenance tab
  const [maintFilter, setMaintFilter] = useState('planned'); // planned, completed

  // Form states
  const [selectedDevice, setSelectedDevice] = useState('');
  
  // Transfer form
  const [targetDept, setTargetDept] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Incident form
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentPriority, setIncidentPriority] = useState('medium');

  // Resolve incident modal/form
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [repairCost, setRepairCost] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [selectedConsumable, setSelectedConsumable] = useState('');
  const [consumableQty, setConsumableQty] = useState('1');

  // Maintenance form
  const [maintTitle, setMaintTitle] = useState('');
  const [maintPlannedDate, setMaintPlannedDate] = useState('');
  const [maintRecurrence, setMaintRecurrence] = useState('none');
  const [maintContractId, setMaintContractId] = useState('');
  const [maintChecklistText, setMaintChecklistText] = useState('');
  
  // Resolve maintenance form
  const [completingMaint, setCompletingMaint] = useState(null);
  const [modalChecklist, setModalChecklist] = useState([]);
  const [maintCost, setMaintCost] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  // Liquidation form
  const [liqReason, setLiqReason] = useState('');
  const [liqNotes, setLiqNotes] = useState('');

  const loadData = async () => {
    try {
      const isGlobalManager = ['admin', 'director', 'accountant', 'itstaff'].includes(user?.role);
      const userDept = user?.department || '';

      // Load devices
      const devUrl = isGlobalManager ? '/api/devices' : `/api/devices?location=${encodeURIComponent(userDept)}`;
      const devRes = await fetch(devUrl);
      const devJson = await devRes.json();
      if (devJson.success) setDevices(devJson.devices);

      // Load incidents
      const incUrl = isGlobalManager ? '/api/incidents' : `/api/incidents?department=${encodeURIComponent(userDept)}`;
      const incRes = await fetch(incUrl);
      const incJson = await incRes.json();
      if (incJson.success) setIncidents(incJson.incidents);

      // Load maintenance
      const maintUrl = isGlobalManager ? '/api/maintenance' : `/api/maintenance?department=${encodeURIComponent(userDept)}`;
      const maintRes = await fetch(maintUrl);
      const maintJson = await maintRes.json();
      if (maintJson.success) setMaintenancePlans(maintJson.plans);

      // Load consumables
      const consRes = await fetch('/api/inventory');
      const consJson = await consRes.json();
      if (consJson.success) setConsumables(consJson.consumables);

      // Load staff list
      const staffRes = await fetch('/api/personnel');
      const staffJson = await staffRes.json();
      if (staffJson.success) setStaffList(staffJson.staff);

      // Load contracts
      const contractsRes = await fetch('/api/contracts');
      const contractsJson = await contractsRes.json();
      if (contractsJson.success) setContracts(contractsJson.contracts);

      // Load departments
      const deptsRes = await fetch('/api/departments');
      const deptsJson = await deptsRes.json();
      if (deptsJson.success) setDepartments(deptsJson.departments);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  // Handle Preset Checklist Change
  const handlePresetChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const presets = CHECKLIST_PRESETS[val] || [];
    setMaintChecklistText(presets.join('\n'));
  };

  // Wrapper to open complete maintenance modal
  const handleSetCompletingMaint = (maint) => {
    setCompletingMaint(maint);
    if (maint) {
      let list = [];
      try {
        list = typeof maint.checklist === 'string' ? JSON.parse(maint.checklist) : (maint.checklist || []);
      } catch (e) {
        console.error(e);
      }
      setModalChecklist(list.map(item => {
        if (typeof item === 'string') return { text: item, checked: false };
        return { text: item.text, checked: !!item.checked };
      }));
      setMaintCost('');
      setMaintNotes('');
      setSelectedConsumable('');
      setConsumableQty('1');
    } else {
      setModalChecklist([]);
    }
  };

  // Handle Transfer Submit
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !targetDept) return;
    const deviceObj = devices.find(d => d.id === parseInt(selectedDevice));
    
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deviceObj,
          location: targetDept,
          user_id: user?.id,
          username: user?.username,
          action_type: 'transfer'
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Cấp phát / Điều chuyển khoa thành công!');
        setTargetDept('');
        setTransferNotes('');
        setSelectedDevice('');
        loadData();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Incident Submit
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !incidentTitle) return;
    
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice,
          title: incidentTitle,
          description: incidentDesc,
          priority: incidentPriority,
          reporter_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã báo hỏng thiết bị thành công! Cán bộ IT sẽ tiếp nhận xử lý.');
        setIncidentTitle('');
        setIncidentDesc('');
        setSelectedDevice('');
        loadData();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Assign ticket to IT Staff
  const assignIncident = async (incId, staffId) => {
    try {
      const res = await fetch('/api/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: incId,
          status: 'processing',
          assignee_id: staffId,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã tiếp nhận và phân công xử lý sự cố!');
        loadData();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Handle Resolve Incident Submit
  const handleResolveIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resolvingIncident.id,
          status: 'resolved',
          assignee_id: resolvingIncident.assignee_id || user?.id,
          repair_cost: repairCost,
          notes: repairNotes,
          consumable_id: selectedConsumable,
          consumable_qty: consumableQty,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Sự cố đã được xử lý hoàn thành. Trạng thái thiết bị khôi phục hoạt động.');
        setResolvingIncident(null);
        setRepairCost('');
        setRepairNotes('');
        setSelectedConsumable('');
        setConsumableQty('1');
        loadData();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Schedule Maintenance Submit (CMMS Version)
  const handleMaintSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice || !maintTitle || !maintPlannedDate) return;

    // Convert checklist text to array
    const checklistArr = maintChecklistText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice,
          title: maintTitle,
          planned_date: maintPlannedDate,
          recurrence: maintRecurrence,
          checklist: checklistArr,
          contract_id: maintContractId || null,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã lập lịch bảo trì định kỳ cho thiết bị thành công!');
        setMaintTitle('');
        setMaintPlannedDate('');
        setMaintRecurrence('none');
        setMaintContractId('');
        setMaintChecklistText('');
        setSelectedDevice('');
        loadData();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Complete Maintenance Submit
  const handleCompleteMaint = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: completingMaint.id,
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          cost: maintCost,
          performed_by: user?.id,
          notes: maintNotes,
          checklist: modalChecklist, // Save updated checklists
          consumable_id: selectedConsumable,
          consumable_qty: consumableQty,
          user_id: user?.id,
          username: user?.username
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Đã ghi nhận hoàn tất bảo trì định kỳ. Linh kiện đã được tự động trừ kho.');
        handleSetCompletingMaint(null);
        loadData();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Handle Liquidation
  const handleLiquidate = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    const deviceObj = devices.find(d => d.id === parseInt(selectedDevice));
    try {
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deviceObj,
          location: 'Thanh lý',
          status: 'liquidated',
          contract_details: `Đã thanh lý. Lý do: ${liqReason}. Ghi chú: ${liqNotes}`,
          user_id: user?.id,
          username: user?.username,
          action_type: 'liquidate'
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Thanh lý thiết bị thành công!');
        setLiqReason('');
        setLiqNotes('');
        setSelectedDevice('');
        loadData();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Format Helper
  const getRecurrenceText = (rec) => {
    switch(rec) {
      case 'daily': return 'Mỗi ngày';
      case 'weekly': return 'Mỗi tuần';
      case 'monthly': return 'Mỗi tháng';
      case 'quarterly': return 'Mỗi quý';
      case 'yearly': return 'Mỗi năm';
      default: return 'Không lặp';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Quản lý Vòng đời Thiết bị & Bảo trì (CMMS)</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Điều chuyển khoa phòng, báo hỏng sự cố, lập lịch bảo trì chu kỳ và thanh lý tài sản.</p>
      </div>

      {/* Sub tabs navigation */}
      <div className="glass-card" style={{ display: 'flex', gap: '10px', padding: '10px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeSubTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('transfer')}>
          🔄 Cấp phát & Điều chuyển
        </button>
        <button className={`btn ${activeSubTab === 'incident' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('incident')}>
          🛠️ Sự cố & Sửa chữa
        </button>
        <button className={`btn ${activeSubTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('maintenance')}>
          📅 Bảo trì định kỳ (CMMS)
        </button>
        <button className={`btn ${activeSubTab === 'liquidate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveSubTab('liquidate')}>
          🗑️ Đề xuất Thanh lý
        </button>
      </div>

      {/* RENDER FORMS BASED ON ACTIVE SUB TAB */}
      <div className="dashboard-grid">
        
        {/* Left Card: Form */}
        <div className="glass-card">
          {activeSubTab === 'transfer' && (
            <form onSubmit={handleTransfer}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--accent-primary)' }}>Bàn giao hoặc Điều chuyển khoa</h3>
              
              <div className="form-group">
                <label className="form-label">Chọn thiết bị cần điều chuyển</label>
                <select required className="form-control" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.filter(d => d.status !== 'liquidated').map(d => (
                    <option key={d.id} value={d.id}>{d.asset_code} - {d.name} (Vị trí hiện tại: {d.location})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Đến khoa / phòng khám mới *</label>
                <select 
                  required 
                  className="form-control" 
                  value={targetDept} 
                  onChange={e => setTargetDept(e.target.value)}
                >
                  <option value="">-- Chọn khoa/phòng ban --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú điều chuyển</label>
                <textarea className="form-control" rows="3" placeholder="Lý do điều chuyển, bàn giao cho bác sĩ A..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Thực hiện điều chuyển</button>
            </form>
          )}

          {activeSubTab === 'incident' && (
            <form onSubmit={handleIncidentSubmit}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--accent-primary)' }}>Báo cáo sự cố thiết bị (Báo hỏng)</h3>
              
              <div className="form-group">
                <label className="form-label">Chọn thiết bị hỏng</label>
                <select required className="form-control" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.filter(d => d.status === 'active' || d.status === 'in_stock').map(d => (
                    <option key={d.id} value={d.id}>{d.asset_code} - {d.name} ({d.location})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tên sự cố ngắn gọn *</label>
                <input type="text" required className="form-control" placeholder="Lỗi màn hình xanh / kẹt giấy máy in" value={incidentTitle} onChange={e => setIncidentTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Độ ưu tiên</label>
                <select className="form-control" value={incidentPriority} onChange={e => setIncidentPriority(e.target.value)}>
                  <option value="low">Thấp (Không gấp)</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Khẩn cấp (Ảnh hưởng khám chữa bệnh)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả sự cố chi tiết</label>
                <textarea className="form-control" rows="3" placeholder="Triệu chứng lỗi, hiện trạng thiết bị..." value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>Báo sự cố & Chuyển trạng thái Hỏng</button>
            </form>
          )}

          {activeSubTab === 'maintenance' && (
            <form onSubmit={handleMaintSubmit}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--accent-primary)' }}>Lên kế hoạch bảo trì thiết bị định kỳ (CMMS)</h3>
              
              <div className="form-group">
                <label className="form-label">Chọn thiết bị bảo trì *</label>
                <select required className="form-control" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.filter(d => d.status !== 'liquidated').map(d => (
                    <option key={d.id} value={d.id}>{d.asset_code} - {d.name} ({d.location})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề bảo trì *</label>
                <input type="text" required className="form-control" placeholder="Bảo trì định kỳ hệ thống HIS" value={maintTitle} onChange={e => setMaintTitle(e.target.value)} />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Chu kỳ lập lịch *</label>
                  <select className="form-control" value={maintRecurrence} onChange={e => setMaintRecurrence(e.target.value)}>
                    <option value="none">Một lần (Không lặp)</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="quarterly">Hàng quý (3 tháng)</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày thực hiện *</label>
                  <input type="date" required className="form-control" value={maintPlannedDate} onChange={e => setMaintPlannedDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hợp đồng bảo trì ngoài liên kết (Nếu có)</label>
                <select className="form-control" value={maintContractId} onChange={e => setMaintContractId(e.target.value)}>
                  <option value="">-- Tự thực hiện (Nội bộ) --</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.contract_number} - {c.supplier} ({c.service?.slice(0, 30)}...)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Quy trình Checklist kiểm tra *</span>
                  <select className="form-control" style={{ width: '180px', padding: '4px 8px', fontSize: '0.75rem', height: 'auto', background: 'rgba(255,255,255,0.05)' }} onChange={handlePresetChange} defaultValue="">
                    <option value="">-- Chọn mẫu nhanh --</option>
                    <option value="pc">Máy tính PC/Laptop</option>
                    <option value="server">Máy chủ Server</option>
                    <option value="printer">Máy in/Ngoại vi</option>
                    <option value="network">Thiết bị mạng</option>
                  </select>
                </label>
                <textarea className="form-control" rows="4" placeholder="Nhập mỗi việc kiểm tra trên 1 dòng..." value={maintChecklistText} onChange={e => setMaintChecklistText(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Tạo Kế hoạch Bảo trì</button>
            </form>
          )}

          {activeSubTab === 'liquidate' && (
            <form onSubmit={handleLiquidate}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--accent-primary)' }}>Đề xuất thanh lý tài sản</h3>
              
              <div className="form-group">
                <label className="form-label">Chọn thiết bị thanh lý</label>
                <select required className="form-control" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.filter(d => d.status !== 'liquidated').map(d => (
                    <option key={d.id} value={d.id}>{d.asset_code} - {d.name} ({d.location} - Trạng thái: {d.status})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lý do thanh lý *</label>
                <input type="text" required className="form-control" placeholder="Thiết bị cũ hỏng không sửa chữa được / Hết thời gian khấu hao" value={liqReason} onChange={e => setLiqReason(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Chi tiết thanh lý (Nguồn thanh lý, số tiền thu về nếu có...)</label>
                <textarea className="form-control" rows="3" placeholder="Kết quả đấu thầu thanh lý, bán phế liệu..." value={liqNotes} onChange={e => setLiqNotes(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>Xác nhận thanh lý tài sản</button>
            </form>
          )}
        </div>

        {/* Right Card: Datagrid or Queue */}
        <div className="glass-card">
          {activeSubTab === 'transfer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Thông tin điều chuyển</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Lịch sử điều chuyển chi tiết có thể được xem khi nhấn chọn "Chi tiết & QR" trên danh mục thiết bị.</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <strong>💡 Quy trình bàn giao:</strong>
                <ol style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                  <li>Cán bộ IT lập phiếu điều chuyển thiết bị.</li>
                  <li>In thẻ tài sản QR và dán lại nếu đổi địa điểm.</li>
                  <li>Bàn giao bàn giao trực tiếp tại khoa/phòng thụ hưởng.</li>
                </ol>
              </div>
            </div>
          )}

          {activeSubTab === 'incident' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh sách phiếu sự cố cần xử lý</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Thiết bị</th>
                      <th>Sự cố</th>
                      <th>Người xử lý</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.filter(i => i.status !== 'resolved').length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có sự cố cần sửa chữa.</td></tr>
                    ) : (
                      incidents.filter(i => i.status !== 'resolved').map(inc => (
                        <tr key={inc.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{inc.asset_code}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{inc.device_name}</div>
                          </td>
                          <td>
                            <div>{inc.title}</div>
                            <div className={`priority-indicator ${inc.priority === 'high' ? 'priority-high' : inc.priority === 'medium' ? 'priority-medium' : 'priority-low'}`}>
                              <div className="priority-dot"></div>
                              <span>{inc.priority === 'high' ? 'Khần' : inc.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>
                            </div>
                          </td>
                          <td>{inc.assignee_name || 'Chưa phân công'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {!inc.assignee_id && (
                                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => assignIncident(inc.id, user?.id)}>
                                  Nhận sửa
                                </button>
                              )}
                              {inc.assignee_id && (
                                <button className="btn btn-secondary border-glow-cyan" style={{ padding: '4px 8px', fontSize: '0.7rem', color: 'var(--accent-secondary)' }} onClick={() => setResolvingIncident(inc)}>
                                  Hoàn thành
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh sách Bảo trì Định kỳ</h3>
                
                {/* Toggle queue and history */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className={`btn ${maintFilter === 'planned' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setMaintFilter('planned')}>
                    Hàng đợi
                  </button>
                  <button className={`btn ${maintFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setMaintFilter('completed')}>
                    Lịch sử
                  </button>
                </div>
              </div>

              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Thiết bị</th>
                      <th>Nội dung bảo trì</th>
                      <th>{maintFilter === 'planned' ? 'Dự kiến' : 'Hoàn thành'}</th>
                      <th>Chi tiết</th>
                      {maintFilter === 'planned' && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {maintenancePlans.filter(m => m.status === maintFilter).length === 0 ? (
                      <tr><td colSpan={maintFilter === 'planned' ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có kế hoạch bảo trì nào.</td></tr>
                    ) : (
                      maintenancePlans.filter(m => m.status === maintFilter).map(maint => (
                        <tr key={maint.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{maint.asset_code}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{maint.device_name}</div>
                          </td>
                          <td>
                            <div>{maint.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Chu kỳ: <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{getRecurrenceText(maint.recurrence)}</span>
                            </div>
                          </td>
                          <td>
                            {maintFilter === 'planned' 
                              ? new Date(maint.planned_date).toLocaleDateString('vi-VN')
                              : maint.completed_date ? new Date(maint.completed_date).toLocaleDateString('vi-VN') : '-'
                            }
                          </td>
                          <td style={{ fontSize: '0.75rem' }}>
                            {maintFilter === 'planned' ? (
                              <div style={{ color: 'var(--text-secondary)' }}>
                                📋 {maint.checklist ? (typeof maint.checklist === 'string' ? JSON.parse(maint.checklist) : maint.checklist).length : 0} bước
                                {maint.contract_number && <div style={{ color: 'var(--accent-secondary)', fontStyle: 'italic' }}>HD: {maint.contract_number}</div>}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <div>Phí: {new Intl.NumberFormat('vi-VN').format(maint.cost)}đ</div>
                                {maint.parts_used && <div style={{ color: 'var(--accent-pink)' }}>Linh kiện: {maint.parts_used}</div>}
                              </div>
                            )}
                          </td>
                          {maintFilter === 'planned' && (
                            <td>
                              <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.7rem' }} onClick={() => handleSetCompletingMaint(maint)}>
                                Hoàn tất
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'liquidate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Danh sách thiết bị đã thanh lý</h3>
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Mã tài sản</th>
                      <th>Tên thiết bị</th>
                      <th>Thông tin thanh lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.filter(d => d.status === 'liquidated').length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có tài sản nào thanh lý</td></tr>
                    ) : (
                      devices.filter(d => d.status === 'liquidated').map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.asset_code}</td>
                          <td>{d.name}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.contract_details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal: Resolve Incident (And deduct parts!) */}
      {resolvingIncident && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.15rem', fontWeight: 700 }}>Cập nhật hoàn thành sửa chữa</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>Thiết bị: <strong>{resolvingIncident.asset_code} - {resolvingIncident.device_name}</strong></p>
            
            <form onSubmit={handleResolveIncident}>
              <div className="form-group">
                <label className="form-label">Chi phí sửa chữa bên ngoài (VNĐ) - Nếu có</label>
                <input type="number" className="form-control" placeholder="0" value={repairCost} onChange={e => setRepairCost(e.target.value)} />
              </div>

              {/* Consumable selection */}
              <div className="form-group">
                <label className="form-label">Linh kiện trong kho đã sử dụng thay thế</label>
                <select className="form-control" value={selectedConsumable} onChange={e => setSelectedConsumable(e.target.value)}>
                  <option value="">-- Không sử dụng linh kiện --</option>
                  {consumables.map(c => (
                    <option key={c.id} value={c.id} disabled={c.current_qty <= 0}>
                      {c.name} (Còn lại: {c.current_qty} {c.unit} - Giá: {new Intl.NumberFormat('vi-VN').format(c.price)}đ)
                    </option>
                  ))}
                </select>
              </div>

              {selectedConsumable && (
                <div className="form-group">
                  <label className="form-label">Số lượng sử dụng *</label>
                  <input type="number" min="1" max="100" className="form-control" value={consumableQty} onChange={e => setConsumableQty(e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Chi tiết kỹ thuật xử lý *</label>
                <textarea required className="form-control" rows="3" placeholder="Đã cài đặt lại OS / đã thay thanh RAM..." value={repairNotes} onChange={e => setRepairNotes(e.target.value)}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResolvingIncident(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận hoàn thành</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Maintenance (CMMS Version with checklist & parts) */}
      {completingMaint && (
        <div className="modal-overlay">
          <div className="glass-card modal-content border-glow-purple" style={{ maxWidth: '520px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-pink)' }}>Hoàn tất quy trình bảo trì thiết bị</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '18px' }}>
              Thiết bị: <strong>{completingMaint.asset_code} - {completingMaint.device_name}</strong>
            </p>
            
            <form onSubmit={handleCompleteMaint}>
              
              {/* Interactive checklist */}
              {modalChecklist.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Từng bước thực hiện Checklist kiểm định *</label>
                  <div className="checklist-container">
                    {modalChecklist.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`checklist-item ${item.checked ? 'checked' : ''}`}
                        onClick={() => {
                          const newCl = [...modalChecklist];
                          newCl[idx].checked = !newCl[idx].checked;
                          setModalChecklist(newCl);
                        }}
                      >
                        <div className="checklist-checkbox">✓</div>
                        <span className="checklist-text">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vui lòng tích kiểm tra đầy đủ các bước trước khi lưu phiếu.</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Phụ tùng thay thế trong kho</label>
                  <select className="form-control" value={selectedConsumable} onChange={e => setSelectedConsumable(e.target.value)}>
                    <option value="">-- Không thay linh kiện --</option>
                    {consumables.map(c => (
                      <option key={c.id} value={c.id} disabled={c.current_qty <= 0}>
                        {c.name} (Còn {c.current_qty} {c.unit} - {new Intl.NumberFormat('vi-VN').format(c.price)}đ)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedConsumable && (
                  <div className="form-group">
                    <label className="form-label">Số lượng thay *</label>
                    <input type="number" min="1" max="100" className="form-control" value={consumableQty} onChange={e => setConsumableQty(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Chi phí phát sinh khác bên ngoài (VNĐ)</label>
                <input type="number" className="form-control" placeholder="0" value={maintCost} onChange={e => setMaintCost(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú kết quả & Đánh giá kỹ thuật *</label>
                <textarea required className="form-control" rows="3" placeholder="Đã hoàn tất các bước kiểm định, thiết bị chạy tốt..." value={maintNotes} onChange={e => setMaintNotes(e.target.value)}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => handleSetCompletingMaint(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu kết quả & Đóng phiếu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
