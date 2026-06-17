import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function DeviceCatalog({ user }) {
  const [devices, setDevices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCatId, setFormCatId] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formFunding, setFormFunding] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formWarrantyMonths, setFormWarrantyMonths] = useState('12');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formSpecs, setFormSpecs] = useState({ CPU: '', RAM: '', Storage: '', OS: '' });

  const canvasRef = useRef(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedCat) queryParams.append('category', selectedCat);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const res = await fetch(`/api/devices?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDevices(json.devices);
        setCategories(json.categories);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [search, selectedCat, selectedStatus]);

  // Handle viewing allocation history when selecting a device
  useEffect(() => {
    if (selectedDevice) {
      fetch(`/api/allocations?device_id=${selectedDevice.id}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) setAllocationHistory(json.logs);
        });
    }
  }, [selectedDevice]);

  // Draw real scannable QR code on canvas with centered official brand logo image
  useEffect(() => {
    if (selectedDevice && canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Real QR code encodes the scan redirect URL for seamless smartphone integration
      const qrData = `${window.location.origin}/?scan=${selectedDevice.asset_code}`;
      
      QRCode.toCanvas(canvas, qrData, {
        margin: 2,
        scale: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) {
          console.error('Error generating QR code:', err);
          return;
        }

        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        
        // Define logo sizing inside the QR code (approx 24% of canvas size)
        const logoSize = Math.floor(size * 0.24);
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        // White circular background for logo overlay
        const bgSize = logoSize + 8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, bgSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        // High quality outer border matching the hospital's blue logo color
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, bgSize / 2, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw official hospital brand logo image in the center
        const img = new Image();
        img.src = '/logo.png';
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
          ctx.restore();
        };
        img.onerror = () => {
          console.warn('Failed to load logo.png, drawing vector fallback');
          // Draw a small red medical cross in a light blue circle
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2 - 2, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          const crossWidth = 3;
          const crossLength = 12;
          ctx.fillRect(size / 2 - crossWidth / 2, size / 2 - crossLength / 2, crossWidth, crossLength);
          ctx.fillRect(size / 2 - crossLength / 2, size / 2 - crossWidth / 2, crossLength, crossWidth);
        };
      });
    }
  }, [selectedDevice]);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      const pDate = formPurchaseDate || new Date().toISOString().split('T')[0];
      const parts = pDate.split('-');
      const year = parseInt(parts[0]);
      const wMonths = parseInt(formWarrantyMonths);
      const wEndDate = new Date(year, parseInt(parts[1]) - 1 + wMonths, parseInt(parts[2]));
      const warranty_end = wEndDate.toISOString().split('T')[0];

      const payload = {
        asset_code: formCode,
        name: formName,
        category_id: formCatId,
        model: formModel,
        manufacturer: formManufacturer,
        serial_number: formSerial,
        specifications: formSpecs,
        location: formLocation || 'Kho thiết bị',
        status: 'in_stock',
        purchase_date: pDate,
        purchase_price: formPrice ? parseFloat(formPrice) : 0,
        funding_source: formFunding,
        supplier: formSupplier,
        warranty_months: wMonths,
        warranty_start: pDate,
        warranty_end,
        user_id: user?.id,
        username: user?.username
      };

      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        setIsAddOpen(false);
        // Reset Form
        setFormName('');
        setFormCode('');
        setFormCatId('');
        setFormModel('');
        setFormManufacturer('');
        setFormSerial('');
        setFormLocation('');
        setFormPrice('');
        setFormFunding('');
        setFormSupplier('');
        setFormWarrantyMonths('12');
        setFormPurchaseDate('');
        setFormSpecs({ CPU: '', RAM: '', Storage: '', OS: '' });
        
        fetchDevices();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditing = () => {
    setFormName(selectedDevice.name);
    setFormCode(selectedDevice.asset_code);
    setFormCatId(selectedDevice.category_id || '');
    setFormModel(selectedDevice.model || '');
    setFormManufacturer(selectedDevice.manufacturer || '');
    setFormSerial(selectedDevice.serial_number);
    setFormLocation(selectedDevice.location);
    setFormPrice(selectedDevice.purchase_price || '');
    setFormFunding(selectedDevice.funding_source || '');
    setFormSupplier(selectedDevice.supplier || '');
    setFormWarrantyMonths(selectedDevice.warranty_months?.toString() || '12');
    setFormPurchaseDate(selectedDevice.purchase_date ? new Date(selectedDevice.purchase_date).toISOString().split('T')[0] : '');
    setFormSpecs(selectedDevice.specifications || { CPU: '', RAM: '', Storage: '', OS: '' });
    setIsEditing(true);
  };

  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    try {
      const pDate = formPurchaseDate || new Date().toISOString().split('T')[0];
      const parts = pDate.split('-');
      const year = parseInt(parts[0]);
      const wMonths = parseInt(formWarrantyMonths);
      const wEndDate = new Date(year, parseInt(parts[1]) - 1 + wMonths, parseInt(parts[2]));
      const warranty_end = wEndDate.toISOString().split('T')[0];

      const payload = {
        id: selectedDevice.id,
        asset_code: formCode,
        name: formName,
        category_id: formCatId,
        model: formModel,
        manufacturer: formManufacturer,
        serial_number: formSerial,
        specifications: formSpecs,
        location: formLocation,
        status: selectedDevice.status, // Preserve status
        purchase_date: pDate,
        purchase_price: formPrice ? parseFloat(formPrice) : 0,
        funding_source: formFunding,
        supplier: formSupplier,
        warranty_months: wMonths,
        warranty_start: pDate,
        warranty_end,
        user_id: user?.id,
        username: user?.username,
        action_type: 'update'
      };

      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        alert('Cập nhật thông tin thiết bị thành công!');
        setIsEditing(false);
        setSelectedDevice(json.device);
        fetchDevices();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const printLabel = () => {
    const statusMap = {
      in_stock: 'Trong kho',
      active: 'Đang sử dụng',
      broken: 'Hỏng hóc',
      maintenance: 'Đang bảo trì',
      waiting_liquidation: 'Chờ thanh lý',
      liquidated: 'Đã thanh lý'
    };
    const statusText = statusMap[selectedDevice.status] || selectedDevice.status;

    let specsText = 'Không có';
    if (selectedDevice.specifications) {
      const s = selectedDevice.specifications;
      const parts = [];
      if (s.CPU) parts.push(`CPU: ${s.CPU}`);
      if (s.RAM) parts.push(`RAM: ${s.RAM}`);
      if (s.Storage) parts.push(`Ổ cứng: ${s.Storage}`);
      if (s.OS) parts.push(`HĐH: ${s.OS}`);
      if (parts.length > 0) specsText = parts.join(' | ');
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>In nhãn định danh ${selectedDevice.asset_code}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; background: #ffffff; padding: 20px; display: flex; justify-content: center; }
            .tag { border: 1.5px solid #cbd5e1; padding: 18px; border-radius: 12px; width: 420px; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); box-sizing: border-box; }
            .header-section { text-align: center; margin-bottom: 12px; }
            .content-section { display: flex; gap: 16px; align-items: center; }
            .qr-container { flex-shrink: 0; border: 1px dashed #cbd5e1; padding: 4px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
            .info-container { flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; text-align: left; }
            .info-item { color: #334155; line-height: 1.3; }
            .info-item strong { color: #0f172a; font-weight: 600; }
            .asset-code-text { font-family: monospace; font-size: 13px; font-weight: 700; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; color: #0369a1; }
            .location-badge { font-weight: 700; color: #10b981; }
            .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase; }
            .status-badge.active { background: #dcfce7; color: #15803d; }
            .status-badge.in_stock { background: #e0e7ff; color: #4338ca; }
            .status-badge.broken { background: #fee2e2; color: #b91c1c; }
            .status-badge.maintenance { background: #fef3c7; color: #b45309; }
            .status-badge.waiting_liquidation { background: #ffedd5; color: #c2410c; }
            .status-badge.liquidated { background: #f1f5f9; color: #475569; }
            .specs-section { border-top: 1px dashed #e2e8f0; margin-top: 12px; padding-top: 8px; font-size: 10px; text-align: left; color: #475569; line-height: 1.4; }
            .footer { font-size: 8px; color: #94a3b8; margin-top: 12px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 6px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="header-section" style="display: flex; align-items: center; justify-content: center; gap: 8px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;">
              <img src="/logo.png" width="42" height="42" style="object-fit: contain; vertical-align: middle;" />
              <div style="text-align: left;">
                <div style="font-weight: 800; font-size: 11px; color: #1e3a8a; letter-spacing: 0.3px; line-height: 1.25;">TRUNG TÂM Y TẾ KHU VỰC LIÊN CHIỂU</div>
                <div style="font-weight: 700; font-size: 8px; color: #2563eb; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 1px;">HỆ THỐNG QUẢN LÝ THIẾT BỊ CNTT TẬP TRUNG</div>
              </div>
            </div>
            
            <div class="content-section">
              <div class="qr-container">
                <img src="${canvasRef.current.toDataURL()}" width="120" height="120" />
              </div>
              <div class="info-container">
                <div class="info-item"><strong>Mã thiết bị:</strong> <span class="asset-code-text">${selectedDevice.asset_code}</span></div>
                <div class="info-item"><strong>Tên thiết bị:</strong> ${selectedDevice.name}</div>
                <div class="info-item"><strong>Model:</strong> ${selectedDevice.model || 'N/A'}</div>
                <div class="info-item"><strong>Số Serial:</strong> ${selectedDevice.serial_number || 'N/A'}</div>
                <div class="info-item"><strong>Nơi sử dụng:</strong> <span class="location-badge">${selectedDevice.location}</span></div>
                <div class="info-item"><strong>Tình trạng:</strong> <span class="status-badge ${selectedDevice.status}">${statusText}</span></div>
              </div>
            </div>
            
            <div class="specs-section">
              <strong>Thông số kỹ thuật:</strong> ${specsText}
            </div>

            <div class="footer">
              Quét mã QR để báo hỏng sự cố hoặc thực hiện kiểm kê tài sản
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header section with add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Danh mục Thiết bị CNTT</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Khai báo, cấu hình thông tin tài sản và in mã QR.</p>
        </div>
        
        {['admin', 'itstaff', 'accountant'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            ➕ Nhập thiết bị mới
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="glass-card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm theo mã tài sản, tên, serial..."
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select 
            className="form-control"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <select 
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="in_stock">Trong kho</option>
            <option value="active">Đang hoạt động</option>
            <option value="broken">Báo hỏng</option>
            <option value="maintenance">Đang sửa chữa</option>
            <option value="liquidated">Đã thanh lý</option>
          </select>
        </div>
      </div>

      {/* Device List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách thiết bị...</div>
      ) : devices.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Không tìm thấy thiết bị nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã TS</th>
                <th>Tên thiết bị</th>
                <th>Danh mục</th>
                <th>Model</th>
                <th>Vị trí / Khoa</th>
                <th>Bảo hành</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(dev => (
                <tr key={dev.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{dev.asset_code}</td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{dev.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>S/N: {dev.serial_number}</div>
                    </div>
                  </td>
                  <td>{dev.category_name}</td>
                  <td>{dev.model || 'N/A'}</td>
                  <td>{dev.location}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      {dev.warranty_end ? new Date(dev.warranty_end).toLocaleDateString('vi-VN') : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${dev.status}`}>
                      {dev.status === 'in_stock' && 'Trong kho'}
                      {dev.status === 'active' && 'Hoạt động'}
                      {dev.status === 'broken' && 'Hỏng'}
                      {dev.status === 'maintenance' && 'Bảo trì'}
                      {dev.status === 'liquidated' && 'Thanh lý'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setSelectedDevice(dev)}
                    >
                      Chi tiết & QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Device */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>Nhập thiết bị mới vào hệ thống</h3>
            <form onSubmit={handleAddDevice}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Mã tài sản (QR ID) *</label>
                  <input type="text" required className="form-control" placeholder="TBYT-PC-020" value={formCode} onChange={e => setFormCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên thiết bị *</label>
                  <input type="text" required className="form-control" placeholder="Máy tính khám bệnh A" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Danh mục nhóm *</label>
                  <select required className="form-control" value={formCatId} onChange={e => setFormCatId(e.target.value)}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hãng sản xuất</label>
                  <input type="text" className="form-control" placeholder="Dell / Canon" value={formManufacturer} onChange={e => setFormManufacturer(e.target.value)} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input type="text" className="form-control" placeholder="Optiplex 3080" value={formModel} onChange={e => setFormModel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số Serial (S/N) *</label>
                  <input type="text" required className="form-control" placeholder="ABC123XYZ" value={formSerial} onChange={e => setFormSerial(e.target.value)} />
                </div>
              </div>

              <h4 style={{ margin: '10px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Thông số kỹ thuật chi tiết</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Bộ vi xử lý (CPU)</label>
                  <input type="text" className="form-control" placeholder="i5 10500" value={formSpecs.CPU} onChange={e => setFormSpecs({...formSpecs, CPU: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bộ nhớ trong (RAM)</label>
                  <input type="text" className="form-control" placeholder="8GB DDR4" value={formSpecs.RAM} onChange={e => setFormSpecs({...formSpecs, RAM: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lưu trữ (SSD/HDD)</label>
                  <input type="text" className="form-control" placeholder="256GB SSD" value={formSpecs.Storage} onChange={e => setFormSpecs({...formSpecs, Storage: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hệ điều hành (OS)</label>
                  <input type="text" className="form-control" placeholder="Windows 11 Pro" value={formSpecs.OS} onChange={e => setFormSpecs({...formSpecs, OS: e.target.value})} />
                </div>
              </div>

              <h4 style={{ margin: '10px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Thông tin tài chính & Bảo hành</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Giá mua (VNĐ)</label>
                  <input type="number" className="form-control" placeholder="12500000" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nguồn kinh phí</label>
                  <input type="text" className="form-control" placeholder="Ngân sách bệnh viện" value={formFunding} onChange={e => setFormFunding(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Thời gian bảo hành (Tháng)</label>
                  <input type="number" className="form-control" value={formWarrantyMonths} onChange={e => setFormWarrantyMonths(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày mua / Ngày nhập</label>
                  <input type="date" className="form-control" value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nhà cung cấp</label>
                  <input type="text" className="form-control" placeholder="Công ty CMC" value={formSupplier} onChange={e => setFormSupplier(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nơi bàn giao ban đầu</label>
                  <input type="text" className="form-control" placeholder="Khoa Khám Bệnh" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thiết bị</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Device Detail & QR Label */}
      {selectedDevice && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <div>
                <span className="user-role" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {isEditing ? 'Đang chỉnh sửa' : selectedDevice.category_name}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {isEditing ? `Sửa: ${selectedDevice.name}` : selectedDevice.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Mã tài sản: <strong style={{ color: 'white' }}>{selectedDevice.asset_code}</strong> | Serial: {selectedDevice.serial_number}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => { setSelectedDevice(null); setIsEditing(false); }}>✖ Đóng</button>
            </div>

            {isEditing ? (
              // EDITING FORM LAYOUT
              <form onSubmit={handleUpdateDevice}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                  
                  {/* Left Column: Form Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Tên thiết bị *</label>
                        <input type="text" required className="form-control" value={formName} onChange={e => setFormName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mã tài sản *</label>
                        <input type="text" required className="form-control" value={formCode} onChange={e => setFormCode(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Danh mục *</label>
                        <select required className="form-control" value={formCatId} onChange={e => setFormCatId(e.target.value)}>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Số Serial (S/N) *</label>
                        <input type="text" required className="form-control" value={formSerial} onChange={e => setFormSerial(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Hãng sản xuất</label>
                        <input type="text" className="form-control" value={formManufacturer} onChange={e => setFormManufacturer(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Model</label>
                        <input type="text" className="form-control" value={formModel} onChange={e => setFormModel(e.target.value)} />
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px', margin: '5px 0' }}>Cấu hình</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">CPU</label>
                        <input type="text" className="form-control" value={formSpecs.CPU} onChange={e => setFormSpecs({...formSpecs, CPU: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">RAM</label>
                        <input type="text" className="form-control" value={formSpecs.RAM} onChange={e => setFormSpecs({...formSpecs, RAM: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ổ cứng</label>
                        <input type="text" className="form-control" value={formSpecs.Storage} onChange={e => setFormSpecs({...formSpecs, Storage: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Hệ điều hành</label>
                        <input type="text" className="form-control" value={formSpecs.OS} onChange={e => setFormSpecs({...formSpecs, OS: e.target.value})} />
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px', margin: '5px 0' }}>Tài chính & Bảo hành</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Giá mua (VNĐ)</label>
                        <input type="number" className="form-control" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Khoa / Vị trí hiện tại</label>
                        <input type="text" className="form-control" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bảo hành (Tháng)</label>
                        <input type="number" className="form-control" value={formWarrantyMonths} onChange={e => setFormWarrantyMonths(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ngày mua</label>
                        <input type="date" className="form-control" value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
                    <div style={{ border: '1px dashed var(--border-color)', padding: '30px 20px', borderRadius: '12px', textAlign: 'center', width: '220px', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '2rem' }}>📝</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>Kiểm tra kỹ thông tin cấu hình và thời gian bảo hành trước khi lưu.</p>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '220px' }}>
                      💾 Lưu thay đổi
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} style={{ width: '220px' }}>
                      Hủy bỏ
                    </button>
                  </div>

                </div>
              </form>
            ) : (
              // READ-ONLY DETAILS LAYOUT
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                
                {/* Left Column: Device Specifications & Asset Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-primary)' }}>Cấu hình chi tiết</h4>
                    <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>CPU:</span>
                        <span>{selectedDevice.specifications?.CPU || 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>RAM:</span>
                        <span>{selectedDevice.specifications?.RAM || 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Lưu trữ:</span>
                        <span>{selectedDevice.specifications?.Storage || 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Hệ điều hành:</span>
                        <span>{selectedDevice.specifications?.OS || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-primary)' }}>Thông tin tài sản</h4>
                    <div className="glass-card" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Vị trí / Phòng:</span>
                        <strong>{selectedDevice.location}</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>Giá mua:</span>
                        <span>{selectedDevice.purchase_price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDevice.purchase_price) : 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Nguồn kinh phí:</span>
                        <span>{selectedDevice.funding_source || 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Thời hạn bảo hành:</span>
                        <span>{selectedDevice.warranty_months} Tháng</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Bắt đầu bảo hành:</span>
                        <span>{selectedDevice.warranty_start ? new Date(selectedDevice.warranty_start).toLocaleDateString('vi-VN') : 'N/A'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Hết hạn bảo hành:</span>
                        <span style={{ fontWeight: 600, color: new Date(selectedDevice.warranty_end) < new Date() ? 'red' : 'green' }}>
                          {selectedDevice.warranty_end ? new Date(selectedDevice.warranty_end).toLocaleDateString('vi-VN') : 'N/A'}
                          {new Date(selectedDevice.warranty_end) < new Date() ? ' (Hết hạn)' : ''}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>Nhà cung cấp:</span>
                        <span>{selectedDevice.supplier || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Relocation history logs */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-primary)' }}>Lịch sử điều chuyển</h4>
                    <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Hành động</th>
                            <th>Từ khoa</th>
                            <th>Đến khoa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocationHistory.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có lịch sử điều chuyển</td></tr>
                          ) : (
                            allocationHistory.map(log => (
                              <tr key={log.id}>
                                <td>{new Date(log.action_date).toLocaleDateString('vi-VN')}</td>
                                <td>{log.type === 'import' ? 'Nhập kho' : log.type === 'transfer' ? 'Điều chuyển' : 'Cấp phát'}</td>
                                <td>{log.from_dept || '—'}</td>
                                <td>{log.to_dept || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Printable QR Label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div className="smart-asset-tag">
                    <div className="smart-asset-tag-header">Thẻ Tài Sản Số</div>
                    
                    <div className="smart-asset-tag-qr-wrapper">
                      <canvas ref={canvasRef} style={{ width: '130px', height: '130px', display: 'block' }} />
                    </div>
                    
                    <div>
                      <div className="smart-asset-tag-code">{selectedDevice.asset_code}</div>
                      <div className="smart-asset-tag-name">{selectedDevice.name}</div>
                    </div>
                    
                    <div className="smart-asset-tag-details">
                      <div className="smart-asset-tag-detail-item">
                        <span className="smart-asset-tag-detail-label">Vị trí:</span>
                        <span className="smart-asset-tag-detail-value">{selectedDevice.location}</span>
                      </div>
                      <div className="smart-asset-tag-detail-item">
                        <span className="smart-asset-tag-detail-label">Trạng thái:</span>
                        <span className={`status-badge ${selectedDevice.status}`} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                          {selectedDevice.status === 'in_stock' && 'Trong kho'}
                          {selectedDevice.status === 'active' && 'Đang sử dụng'}
                          {selectedDevice.status === 'broken' && 'Hỏng hóc'}
                          {selectedDevice.status === 'maintenance' && 'Đang bảo trì'}
                          {selectedDevice.status === 'waiting_liquidation' && 'Chờ thanh lý'}
                          {selectedDevice.status === 'liquidated' && 'Đã thanh lý'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={printLabel} style={{ width: '230px' }}>
                    🖨️ In nhãn mã QR tài sản
                  </button>

                  {['admin', 'itstaff', 'accountant'].includes(user?.role) && (
                    <>
                      <button className="btn btn-secondary" onClick={startEditing} style={{ width: '230px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
                        ✏️ Chỉnh sửa thông tin
                      </button>
                      <div style={{ width: '230px', marginTop: '10px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🔄 Thay đổi trạng thái</label>
                        <select 
                          className="form-control" 
                          style={{ padding: '6px 8px', fontSize: '0.8rem', height: '32px' }}
                          value={selectedDevice.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              const payload = {
                                id: selectedDevice.id,
                                asset_code: selectedDevice.asset_code,
                                name: selectedDevice.name,
                                category_id: selectedDevice.category_id,
                                model: selectedDevice.model,
                                manufacturer: selectedDevice.manufacturer,
                                serial_number: selectedDevice.serial_number,
                                specifications: selectedDevice.specifications,
                                location: selectedDevice.location,
                                status: newStatus,
                                purchase_date: selectedDevice.purchase_date ? new Date(selectedDevice.purchase_date).toISOString().split('T')[0] : null,
                                purchase_price: selectedDevice.purchase_price || 0,
                                funding_source: selectedDevice.funding_source,
                                supplier: selectedDevice.supplier,
                                warranty_months: selectedDevice.warranty_months,
                                warranty_start: selectedDevice.warranty_start ? new Date(selectedDevice.warranty_start).toISOString().split('T')[0] : null,
                                warranty_end: selectedDevice.warranty_end ? new Date(selectedDevice.warranty_end).toISOString().split('T')[0] : null,
                                contract_details: selectedDevice.contract_details,
                                qr_code: selectedDevice.qr_code,
                                user_id: user?.id,
                                username: user?.username,
                                action_type: 'update'
                              };

                              const res = await fetch('/api/devices', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                              });
                              const json = await res.json();
                              if (json.success) {
                                setSelectedDevice(json.device);
                                setDevices(prev => prev.map(d => d.id === selectedDevice.id ? json.device : d));
                                alert('Đã cập nhật trạng thái thiết bị thành công vào cơ sở dữ liệu!');
                              } else {
                                alert('Lỗi: ' + json.error);
                              }
                            } catch (err) {
                              alert('Lỗi kết nối: ' + err.message);
                            }
                          }}
                        >
                          <option value="in_stock">Trong kho</option>
                          <option value="active">Hoạt động</option>
                          <option value="broken">Hỏng hóc</option>
                          <option value="maintenance">Đang bảo trì</option>
                          <option value="waiting_liquidation">Chờ thanh lý</option>
                          <option value="liquidated">Đã thanh lý</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
