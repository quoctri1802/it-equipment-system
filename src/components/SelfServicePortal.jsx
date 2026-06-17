import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';

export default function SelfServicePortal({ user, initialScanCode, onClearInitialScan }) {
  const [activeMobileTab, setActiveMobileTab] = useState('scan'); // scan, tickets, create, devices
  const [requests, setRequests] = useState([]);
  const [myDeptDevices, setMyDeptDevices] = useState([]);
  const [allItStaff, setAllItStaff] = useState([]);

  // Trigger scan when initialScanCode is passed from URL query
  useEffect(() => {
    if (initialScanCode) {
      setActiveMobileTab('scan');
      handleScanDevice(initialScanCode);
      if (onClearInitialScan) {
        onClearInitialScan();
      }
    }
  }, [initialScanCode]);
  
  // Scanner States
  const [scannedDevice, setScannedDevice] = useState(null);
  const [scannedDeviceHistory, setScannedDeviceHistory] = useState([]);
  const [scanPaused, setScanPaused] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // prompt, granted, denied
  const [scanMessage, setScanMessage] = useState('Di chuyển camera đến mã QR trên thiết bị...');

  // Create Request Form States
  const [formRequestType, setFormRequestType] = useState('repair'); // repair, upgrade, borrow
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formTargetDate, setFormTargetDate] = useState('');

  // Selected Ticket for details/admin updates
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminAssignee, setAdminAssignee] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Play scanning beep sound mathematically via Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.12);
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.warn('AudioContext beep blocked by browser policy:', err);
    }
  };

  const isITUser = ['admin', 'itstaff'].includes(user?.role);
  const userDept = user?.department || 'Khoa Cấp Cứu';

  // Fetch Support Tickets
  const fetchTickets = async () => {
    try {
      let url = '/api/support-requests';
      if (!isITUser) {
        url += `?department=${encodeURIComponent(userDept)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setRequests(json.requests);
      }
    } catch (err) {
      console.error('Lỗi lấy phiếu tự phục vụ:', err);
    }
  };

  // Fetch Devices in user's department
  const fetchMyDeptDevices = async () => {
    try {
      const locationFilter = isITUser ? '' : userDept;
      const res = await fetch(`/api/devices?location=${encodeURIComponent(locationFilter)}`);
      const json = await res.json();
      if (json.success) {
        setMyDeptDevices(json.devices);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách thiết bị khoa:', err);
    }
  };

  // Fetch IT staff for assignment
  const fetchItStaff = async () => {
    try {
      const res = await fetch('/api/personnel');
      const json = await res.json();
      if (json.success) {
        setAllItStaff(json.staff);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách nhân sự IT:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchMyDeptDevices();
    fetchItStaff();
  }, [user]);

  // Handle Real Camera on Mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Real-time camera QR code decoding loop using jsQR
  useEffect(() => {
    let active = true;
    let animationId = null;
    
    const scanFrame = () => {
      if (!active) return;
      
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && !scanPaused) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data) {
            handleScanDevice(code.data);
            setScanPaused(true); // Pause scanning on success
            return;
          }
        } catch (err) {
          console.error('Error decoding QR frame:', err);
        }
      }
      
      if (!scanPaused) {
        animationId = requestAnimationFrame(scanFrame);
      }
    };
    
    if (cameraPermission === 'granted' && !scanPaused) {
      animationId = requestAnimationFrame(scanFrame);
    }
    
    return () => {
      active = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [cameraPermission, scanPaused]);

  const startCamera = async () => {
    try {
      setCameraPermission('prompt');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');
      setScanMessage('Di chuyển camera đến mã QR trên thiết bị...');
    } catch (err) {
      console.error('Lỗi truy cập camera:', err);
      setCameraPermission('denied');
      setScanMessage('Không thể truy cập camera. Vui lòng kiểm tra quyền camera trong cài đặt.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Handle Scan Action (Simulated or Camera Capture)
  const handleScanDevice = async (assetCode) => {
    if (!assetCode) return;
    
    // Extract asset code if it is a URL
    let cleanCode = assetCode;
    if (assetCode.includes('?scan=')) {
      try {
        const urlObj = new URL(assetCode);
        const scanParam = urlObj.searchParams.get('scan');
        if (scanParam) {
          cleanCode = scanParam;
        }
      } catch (err) {
        const parts = assetCode.split('?scan=');
        if (parts.length > 1) {
          cleanCode = parts[1].split('&')[0];
        }
      }
    }
    
    // Play sound and trigger screen flash
    playBeep();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    setScanMessage(`Đã quét mã: ${cleanCode}. Đang tìm kiếm thông tin...`);

    try {
      // Find device details
      const res = await fetch(`/api/devices?search=${encodeURIComponent(cleanCode)}`);
      const json = await res.json();
      if (json.success && json.devices.length > 0) {
        const dev = json.devices[0];
        setScannedDevice(dev);
        
        // Prefill device in creation form
        setFormDeviceId(dev.id);

        // Fetch logs for this device
        const logRes = await fetch(`/api/allocations?device_id=${dev.id}`);
        const logJson = await logRes.json();
        if (logJson.success) {
          setScannedDeviceHistory(logJson.logs);
        }
        setScanMessage('Đã tìm thấy thiết bị định danh thành công!');
      } else {
        setScannedDevice(null);
        setScanMessage(`Mã thiết bị "${assetCode}" không tồn tại trong hệ thống.`);
      }
    } catch (err) {
      setScanMessage(`Lỗi khi tải thông tin thiết bị: ${err.message}`);
    }
  };

  const handleResetScan = () => {
    setScannedDevice(null);
    setScannedDeviceHistory([]);
    setScanPaused(false);
    setScanMessage('Di chuyển camera đến mã QR trên thiết bị...');
  };

  // IT Staff Quick Inventory Check
  const handleInventoryCheck = async () => {
    if (!scannedDevice) return;
    try {
      // Create transaction log
      const res = await fetch('/api/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: scannedDevice.id,
          asset_code: scannedDevice.asset_code,
          name: scannedDevice.name,
          category_id: scannedDevice.category_id,
          model: scannedDevice.model,
          manufacturer: scannedDevice.manufacturer,
          serial_number: scannedDevice.serial_number,
          specifications: scannedDevice.specifications,
          location: scannedDevice.location, // Keep same location
          status: scannedDevice.status,     // Keep same status
          user_id: user?.id,
          username: user?.username,
          action_type: 'update' // Triggers audit log
        })
      });

      // Write allocation log type 'inventory_check' directly via custom fetch call or DB insert?
      // Since devices PUT does audit log, we can also insert allocation log via custom endpoint, 
      // but to keep it simple, we write a specific message.
      const json = await res.json();
      if (json.success) {
        alert(`Đã ghi nhận kiểm kê thiết bị ${scannedDevice.asset_code} thành công tại khoa ${scannedDevice.location}!`);
        // Refresh device history logs
        const logRes = await fetch(`/api/allocations?device_id=${scannedDevice.id}`);
        const logJson = await logRes.json();
        if (logJson.success) {
          setScannedDeviceHistory(logJson.logs);
        }
      }
    } catch (err) {
      alert(`Lỗi kiểm kê: ${err.message}`);
    }
  };

  // Submit Support Ticket Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Vui lòng điền tiêu đề yêu cầu.');
      return;
    }

    try {
      const payload = {
        device_id: formDeviceId || null,
        request_type: formRequestType,
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        requester_id: user.id,
        department: userDept,
        target_date: formTargetDate || null,
        username: user.username
      };

      const res = await fetch('/api/support-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        alert('Gửi yêu cầu hỗ trợ thành công! Đội ngũ CNTT đã nhận được thông tin.');
        // Reset form
        setFormTitle('');
        setFormDescription('');
        setFormPriority('medium');
        setFormTargetDate('');
        
        // Refresh list
        fetchTickets();
        
        // Redirect to tickets tab
        setActiveMobileTab('tickets');
      } else {
        alert(`Lỗi: ${json.error}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối: ${err.message}`);
    }
  };

  // IT Admin Update Ticket Status / Assignment
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: selectedTicket.id,
        status: adminStatus,
        assigned_to: adminAssignee || null,
        notes: adminNotes,
        user_id: user.id,
        username: user.username
      };

      const res = await fetch('/api/support-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        alert('Cập nhật trạng thái phiếu hỗ trợ thành công!');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        alert(`Lỗi: ${json.error}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối: ${err.message}`);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      submitted: 'Mới gửi',
      approved: 'Đã duyệt',
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      rejected: 'Từ chối'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority) => {
    const priorityMap = {
      high: 'Khẩn cấp',
      medium: 'Trung bình',
      low: 'Thấp'
    };
    return priorityMap[priority] || priority;
  };

  const getRequestTypeText = (type) => {
    const typeMap = {
      repair: 'Sửa chữa hỏng hóc',
      upgrade: 'Nâng cấp thiết bị',
      borrow: 'Mượn thiết bị'
    };
    return typeMap[type] || type;
  };

  return (
  <div className="self-service-portal-wrapper">
      
      {/* Dashboard header for Self Service Portal */}
      <div className="portal-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Cổng tự phục vụ & Trợ lý di động</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Dành cho nhân viên khoa {userDept} và nhân viên IT báo sự cố, quản lý kiểm kê tài sản qua thiết bị di động.
          </p>
        </div>
      </div>

      {/* Main Grid: Desktop displays side-by-side dashboard and simulated phone shell */}
      <div className="self-service-grid">
        
        {/* LEFT COLUMN: DESKTOP CONTROL PANEL / WEB VIEW */}
        <div className="glass-card self-service-desktop-col">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
              Danh sách Phiếu hỗ trợ ({userDept})
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Nhân viên các khoa/phòng có thể theo dõi tiến độ xử lý của từng phiếu trực tiếp dưới đây hoặc tạo phiếu mới qua điện thoại di động bên phải.
            </p>
          </div>

          <div className="request-list-container">
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                Không có phiếu yêu cầu nào được tìm thấy.
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="request-card" onClick={() => setSelectedTicket(req)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={`request-type-badge ${req.request_type}`}>
                      {getRequestTypeText(req.request_type)}
                    </span>
                    <span className={`status-badge ${req.status}`}>
                      {getStatusText(req.status)}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>{req.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {req.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Khoa: <strong>{req.department}</strong></span>
                    <span>Hạn: <strong>{req.target_date ? new Date(req.target_date).toLocaleDateString('vi-VN') : 'Không có'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* IT STAFF ONLY: QUICK LINK TO VIEW ASSIGNED TICKETS */}
          {isITUser && (
            <div className="it-admin-banner">
              🔑 <strong>Quyền hạn CNTT:</strong> Bạn có quyền phê duyệt, thay đổi tiến độ timeline và phân công người phụ trách kỹ thuật cho các yêu cầu trên. Hãy nhấp vào bất kỳ thẻ yêu cầu nào để cập nhật.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SIMULATED SMARTPHONE SHELL */}
        <div className="self-service-mobile-wrapper">
          
          {/* Smartphone mockup layout */}
          <div className="mobile-portal-shell">
            
            {/* Mock phone status bar */}
            <div className="mock-phone-status-bar">
              <span>📡 Viettel 5G</span>
              <span>16:20</span>
              <span>🔋 98%</span>
            </div>

            {/* Mock phone app header */}
            <div className="mobile-app-header">
              <span style={{ fontSize: '1.3rem' }}>📱</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'white', lineHeight: '1.2' }}>PORTAL DI ĐỘNG TTYT</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>KIỂM KÊ & TỰ PHỤC VỤ</div>
              </div>
              <span style={{ fontSize: '0.65rem', background: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '10px', color: 'white', fontWeight: 700 }}>
                {user.role === 'depthead' ? 'KHOA/PHÒNG' : 'CNTT'}
              </span>
            </div>

            {/* ACTIVE TAB CONTENTS */}
            <div className="mobile-tab-content">
              
              {/* TAB 1: SCANNER */}
              {activeMobileTab === 'scan' && (
                <div className="mobile-tab-scroll-container">
                  
                  {/* Scanning box */}
                  <div className="scanner-viewport" style={{ display: scannedDevice ? 'none' : 'block' }}>
                    <div className={`scanner-beep-flash ${flashActive ? 'active' : ''}`} />
                    
                    <video ref={videoRef} autoPlay playsInline muted className="scanner-camera-feed" />

                    <div className="scanner-overlay-guide">
                      <div className="scanner-box">
                        <div className="scanner-corner top-left" />
                        <div className="scanner-corner top-right" />
                        <div className="scanner-corner bottom-left" />
                        <div className="scanner-corner bottom-right" />
                      </div>
                    </div>
                  </div>

                  {/* Scan Info Display */}
                  {!scannedDevice && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {scanMessage}
                    </div>
                  )}

                  {/* Display details of Scanned Device */}
                  {scannedDevice && (
                    <div className="glass-card scanned-device-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'slideIn 0.3s ease-out', borderRadius: '16px', border: '1px solid rgba(6, 182, 212, 0.25)', boxShadow: '0 8px 32px 0 rgba(6, 182, 212, 0.1)' }}>
                      
                      {/* Card Header with Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                          {scannedDevice.category_name?.includes('in') || scannedDevice.name?.toLowerCase().includes('in') ? '🖨️' : 
                           scannedDevice.category_name?.includes('mạng') || scannedDevice.category_name?.includes('Network') ? '📡' : 
                           scannedDevice.category_name?.includes('chủ') || scannedDevice.category_name?.includes('Server') ? '🎛️' : '💻'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scannedDevice.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{scannedDevice.asset_code}</span>
                            <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SN: {scannedDevice.serial_number || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Khoa / Phòng</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>{scannedDevice.location}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Trạng thái</span>
                          <span className={`status-badge ${scannedDevice.status}`} style={{ fontSize: '0.65rem', padding: '2px 6px', width: 'fit-content', fontWeight: 700 }}>
                            {scannedDevice.status === 'active' && '🟢 Hoạt động'}
                            {scannedDevice.status === 'broken' && '🔴 Báo hỏng'}
                            {scannedDevice.status === 'maintenance' && '🔧 Đang sửa'}
                            {scannedDevice.status === 'in_stock' && '🔵 Trong kho'}
                            {!['active', 'broken', 'maintenance', 'in_stock'].includes(scannedDevice.status) && getStatusText(scannedDevice.status)}
                          </span>
                        </div>
                      </div>

                      {/* Technical specifications sub-card */}
                      {scannedDevice.specifications && Object.keys(scannedDevice.specifications).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.3px' }}>Cấu hình phần cứng:</div>
                          {Object.entries(scannedDevice.specifications).map(([key, val]) => val && (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{key}:</span>
                              <strong style={{ color: 'white' }}>{val}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Scanned device actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '2px' }}>
                        
                        {/* Quick action group */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* Report incident button (For all users) */}
                          <button 
                            type="button"
                            className="btn btn-danger" 
                            style={{ flex: 1, padding: '8px 4px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => {
                              setFormRequestType('repair');
                              setFormTitle(`Báo hỏng thiết bị ${scannedDevice.asset_code}`);
                              setFormDescription(`Báo hỏng khẩn cấp cho thiết bị: ${scannedDevice.name}.\n- Vị trí: ${scannedDevice.location}\n- Triệu chứng: [Vui lòng điền cụ thể...]`);
                              setFormDeviceId(scannedDevice.id);
                              setActiveMobileTab('create');
                            }}
                          >
                            ⚠️ Báo hỏng máy
                          </button>

                          {/* Borrow button (For all users) */}
                          <button 
                            type="button"
                            className="btn" 
                            style={{ flex: 1, padding: '8px 4px', fontSize: '0.7rem', fontWeight: 700, background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(236,72,153,0.2)' }}
                            onClick={() => {
                              setFormRequestType('borrow');
                              setFormTitle(`Đăng ký mượn máy ${scannedDevice.asset_code}`);
                              setFormDescription(`Đăng ký mượn máy dự phòng phục vụ công tác tại khoa/phòng:\n- Thiết bị đăng ký: ${scannedDevice.name} (Mã: ${scannedDevice.asset_code})\n- Lý do: [Vui lòng điền mục đích sử dụng...]`);
                              setFormDeviceId(scannedDevice.id);
                              setActiveMobileTab('create');
                            }}
                          >
                            📋 Đăng ký mượn
                          </button>
                        </div>

                        {/* IT Quick Inventory verify check button */}
                        {isITUser && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <button 
                              type="button"
                              className="btn btn-primary" 
                              style={{ flex: 1, padding: '8px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', border: 'none' }}
                              onClick={handleInventoryCheck}
                            >
                              ✓ Ghi nhận kiểm kê
                            </button>
                          </div>
                        )}

                        {/* Reset scan button */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '8px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={handleResetScan}
                          >
                            🔄 Quét thiết bị khác
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: MOB-TICKETS */}
              {activeMobileTab === 'tickets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Yêu cầu tại khoa {userDept}</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {requests.slice(0, 4).map(req => (
                      <div 
                        key={req.id} 
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
                        onClick={() => setSelectedTicket(req)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{req.title}</span>
                          <span className={`status-badge ${req.status}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                            {getStatusText(req.status)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <span>Loại: {req.request_type === 'repair' ? 'Sửa' : 'Nâng cấp'}</span>
                          <span>Hạn: {req.target_date ? new Date(req.target_date).toLocaleDateString('vi-VN') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CREATE REQUEST FORM */}
              {activeMobileTab === 'create' && (
                <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Gửi yêu cầu hỗ trợ dịch vụ</div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Loại yêu cầu</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.7rem', padding: '6px', height: 'auto' }}
                      value={formRequestType}
                      onChange={e => setFormRequestType(e.target.value)}
                    >
                      <option value="repair">Sửa chữa hư hỏng</option>
                      <option value="upgrade">Nâng cấp phần mềm/ổ cứng</option>
                      <option value="borrow">Mượn thiết bị dự phòng</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Thiết bị liên quan (ID hoặc Mã)</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.7rem', padding: '6px', height: 'auto' }}
                      value={formDeviceId}
                      onChange={e => setFormDeviceId(e.target.value)}
                    >
                      <option value="">-- Chọn thiết bị khoa (Tùy chọn) --</option>
                      {myDeptDevices.map(d => (
                        <option key={d.id} value={d.id}>{d.asset_code} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Tiêu đề ngắn gọn *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      style={{ fontSize: '0.7rem', padding: '6px' }}
                      placeholder="VD: Không kết nối được internet" 
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Mô tả chi tiết</label>
                    <textarea 
                      rows="3" 
                      className="form-control" 
                      style={{ fontSize: '0.7rem', padding: '6px' }}
                      placeholder="Mô tả cụ thể triệu chứng sự cố hoặc nhu cầu mượn..." 
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Độ ưu tiên</label>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.7rem', padding: '6px', height: 'auto' }}
                        value={formPriority}
                        onChange={e => setFormPriority(e.target.value)}
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Khẩn cấp</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Hạn hoàn thành</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ fontSize: '0.7rem', padding: '6px', height: 'auto' }}
                        value={formTargetDate}
                        onChange={e => setFormTargetDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '8px', fontSize: '0.7rem', marginTop: '6px' }}>
                     gửi phiếu hỗ trợ
                  </button>
                </form>
              )}

              {/* TAB 4: MY DEPT DEVICES */}
              {activeMobileTab === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Danh mục máy tại {userDept}</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {myDeptDevices.length === 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Chưa cấp phát máy nào tại khoa.</div>
                    ) : (
                      myDeptDevices.map(d => (
                        <div 
                          key={d.id} 
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}
                          onClick={() => {
                            handleScanDevice(d.asset_code);
                            setActiveMobileTab('scan');
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>{d.asset_code}</span>
                            <span className={`status-badge ${d.status}`} style={{ fontSize: '0.5rem', padding: '1px 3px' }}>{d.status}</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{d.name}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* MOCK SMARTPHONE BOTTOM NAVIGATION BAR */}
            <div className="mobile-bottom-nav">
              <div 
                className={`mobile-bottom-nav-item ${activeMobileTab === 'scan' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('scan')}
              >
                <span className="mobile-bottom-nav-icon">📷</span>
                <span>Quét mã</span>
              </div>
              
              <div 
                className={`mobile-bottom-nav-item ${activeMobileTab === 'tickets' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('tickets')}
              >
                <span className="mobile-bottom-nav-icon">📋</span>
                <span>Yêu cầu</span>
              </div>

              <div 
                className={`mobile-bottom-nav-item ${activeMobileTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('create')}
              >
                <span className="mobile-bottom-nav-icon">➕</span>
                <span>Gửi phiếu</span>
              </div>

              <div 
                className={`mobile-bottom-nav-item ${activeMobileTab === 'devices' ? 'active' : ''}`}
                onClick={() => setActiveMobileTab('devices')}
              >
                <span className="mobile-bottom-nav-icon">💻</span>
                <span>Thiết bị</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL: SUPPORT TICKET DETAILS & IT ADMINISTRATION CONTROLS */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="glass-card modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {getRequestTypeText(selectedTicket.request_type)}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedTicket.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Gửi bởi: <strong>{selectedTicket.requester_name || 'Nhân viên khoa'}</strong> ({selectedTicket.department}) | Lúc: {new Date(selectedTicket.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setSelectedTicket(null)}>✖ Đóng</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              
              {/* Info Detail */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mô tả chi tiết:</span>
                  <p style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginTop: '6px', fontSize: '0.8rem', color: 'white', whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.description || 'Không có mô tả.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Thiết bị liên quan:</span>
                  <strong>{selectedTicket.device_name ? `${selectedTicket.asset_code} - ${selectedTicket.device_name}` : 'Không chỉ định'}</strong>
                  
                  <span style={{ color: 'var(--text-secondary)' }}>Độ ưu tiên:</span>
                  <span style={{ color: selectedTicket.priority === 'high' ? 'red' : 'inherit', fontWeight: 600 }}>{getPriorityText(selectedTicket.priority)}</span>
                  
                  <span style={{ color: 'var(--text-secondary)' }}>Phân công:</span>
                  <strong>{selectedTicket.assignee_name || 'Chưa phân công'}</strong>
                </div>
              </div>

              {/* Progress Tracking Timeline */}
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tiến độ xử lý yêu cầu:</span>
                <div className="material-timeline">
                  <div className={`timeline-item completed`}>
                    <div className="timeline-line" />
                    <div className="timeline-node">✓</div>
                    <div className="timeline-content">
                      <div className="timeline-title">Đã tiếp nhận yêu cầu</div>
                      <div className="timeline-desc">Hệ thống ghi nhận phiếu mới từ khoa</div>
                    </div>
                  </div>

                  <div className={`timeline-item ${['approved', 'processing', 'completed'].includes(selectedTicket.status) ? 'completed' : selectedTicket.status === 'submitted' ? 'active' : ''}`}>
                    <div className="timeline-line" />
                    <div className="timeline-node">{['approved', 'processing', 'completed'].includes(selectedTicket.status) ? '✓' : '2'}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">Đã phê duyệt yêu cầu</div>
                      <div className="timeline-desc">IT duyệt phương án hoặc kế hoạch cho mượn máy</div>
                    </div>
                  </div>

                  <div className={`timeline-item ${['processing', 'completed'].includes(selectedTicket.status) ? 'completed' : selectedTicket.status === 'approved' ? 'active' : ''}`}>
                    <div className="timeline-line" />
                    <div className="timeline-node">{['processing', 'completed'].includes(selectedTicket.status) ? '✓' : '3'}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">Đang triển khai xử lý</div>
                      <div className="timeline-desc">{selectedTicket.assignee_name ? `Kỹ thuật viên ${selectedTicket.assignee_name} phụ trách` : 'Đang tìm kiếm kỹ thuật viên'}</div>
                    </div>
                  </div>

                  <div className={`timeline-item ${selectedTicket.status === 'completed' ? 'completed' : selectedTicket.status === 'processing' ? 'active' : ''}`}>
                    <div className="timeline-node">🏁</div>
                    <div className="timeline-content">
                      <div className="timeline-title">Hoàn thành</div>
                      <div className="timeline-desc">Đã xử lý xong. Thiết bị hoạt động ổn định.</div>
                    </div>
                  </div>
                </div>

                {selectedTicket.notes && (
                  <div style={{ marginTop: '10px', background: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--status-maintenance)', padding: '8px 10px', borderRadius: '4px', fontSize: '0.78rem' }}>
                    💡 <strong>Ghi chú từ IT:</strong> {selectedTicket.notes}
                  </div>
                )}
              </div>

            </div>

            {/* IT STAFF ONLY: UPDATE & ACTION CONTROLS */}
            {isITUser && (
              <form onSubmit={handleUpdateTicket} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 700 }}>⚙️ Bảng kỹ thuật IT: Xử lý và Phân công</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Trạng thái xử lý phiếu</label>
                    <select 
                      className="form-control" 
                      value={adminStatus || selectedTicket.status} 
                      onChange={e => setAdminStatus(e.target.value)}
                    >
                      <option value="submitted">Mới gửi (Chờ duyệt)</option>
                      <option value="approved">Đã phê duyệt (Đợi xử lý)</option>
                      <option value="processing">Đang tiến hành xử lý kỹ thuật</option>
                      <option value="completed">Đã hoàn thành bàn giao</option>
                      <option value="rejected">Từ chối / Hủy bỏ yêu cầu</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Kỹ thuật viên phụ trách</label>
                    <select 
                      className="form-control" 
                      value={adminAssignee || selectedTicket.assigned_to || ''} 
                      onChange={e => setAdminAssignee(e.target.value)}
                    >
                      <option value="">-- Chọn kỹ thuật viên IT --</option>
                      {allItStaff.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Ghi chú kỹ thuật / Cập nhật tiến độ</label>
                  <textarea 
                    rows="2" 
                    className="form-control" 
                    placeholder="Nhập ghi chú cập nhật tiến độ, thiết bị mượn số mấy, linh kiện dùng là gì..."
                    value={adminNotes || selectedTicket.notes || ''}
                    onChange={e => setAdminNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu cập nhật</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
