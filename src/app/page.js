'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import DeviceCatalog from '@/components/DeviceCatalog';
import DeviceLifecycle from '@/components/DeviceLifecycle';
import WarrantyContracts from '@/components/WarrantyContracts';
import Inventory from '@/components/Inventory';
import Personnel from '@/components/Personnel';
import AuditLogs from '@/components/AuditLogs';
import UserManagement from '@/components/UserManagement';
import SelfServicePortal from '@/components/SelfServicePortal';
import Reports from '@/components/Reports';
import Logo from '@/components/Logo';

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initializingDb, setInitializingDb] = useState(true);
  const [scanQueryParam, setScanQueryParam] = useState('');
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Trigger database setup on first load
  useEffect(() => {
    fetch('/api/init-db')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('Database initialized successfully.');
          setDbInitialized(true);
        } else {
          console.error('Database initialization failed:', data.error);
        }
        setInitializingDb(false);
      })
      .catch(err => {
        console.error('Error connecting to database initialization route:', err);
        setInitializingDb(false);
      });
  }, []);

  // Check URL query parameters on load/user login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scanCode = params.get('scan');
      if (scanCode) {
        setScanQueryParam(scanCode);
        if (user) {
          setActiveTab('self_service');
        }
      }
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('scan')) {
        setActiveTab('self_service');
        return;
      }
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (initializingDb) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', gap: '20px' }}>
        <div className="rotate-slow pulsate">
          <Logo width={120} height={120} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>Đang tải hệ thống...</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Hệ thống quản lý thiết bị CNTT tập trung</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>"Số hóa quy trình - Tối ưu hiệu năng - Kiến tạo y tế thông minh"</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />

      {/* Main content pane */}
      <div className="main-content">
        <Header user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />

        <main className="page-container">
          {activeTab === 'dashboard' && <Dashboard user={user} />}
          {activeTab === 'reports' && <Reports user={user} />}
          {activeTab === 'self_service' && (
            <SelfServicePortal 
              user={user} 
              initialScanCode={scanQueryParam} 
              onClearInitialScan={() => setScanQueryParam('')} 
            />
          )}
          {activeTab === 'devices' && <DeviceCatalog user={user} />}
          {activeTab === 'lifecycle' && <DeviceLifecycle user={user} />}
          {activeTab === 'warranty' && <WarrantyContracts user={user} />}
          {activeTab === 'inventory' && <Inventory user={user} />}
          {activeTab === 'personnel' && <Personnel user={user} />}
          {activeTab === 'users' && <UserManagement user={user} />}
          {activeTab === 'audit' && <AuditLogs />}
        </main>

        <footer style={{ 
          padding: '20px 30px', 
          borderTop: '1px solid var(--border-color)', 
          textAlign: 'center', 
          color: 'var(--text-secondary)', 
          fontSize: '0.85rem',
          background: 'var(--bg-secondary)',
          marginTop: 'auto'
        }}>
          @2026 Trung tâm Y tế khu vực Liên Chiểu - Ứng dụng được nghiên cứu và phát triển bởi tổ CNTT
        </footer>
      </div>
    </div>
  );
}
