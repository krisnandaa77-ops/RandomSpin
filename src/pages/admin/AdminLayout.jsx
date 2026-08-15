import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Gift, Users, Trophy, PlayCircle, LayoutDashboard, Menu, X, LogOut } from 'lucide-react';
import PageTransition from '../../components/PageTransition';
import { clearAuth } from './LoginGate';

const BREADCRUMB_MAP = {
  '/admin': 'Dashboard',
  '/admin/dashboard': 'Dashboard',
  '/admin/settings': 'Pengaturan',
  '/admin/prizes': 'Hadiah',
  '/admin/participants': 'Peserta',
  '/admin/winners': 'Rekap Pemenang',
};

const AdminLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumb = BREADCRUMB_MAP[location.pathname] || 'Dashboard';

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  const navLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
    { to: '/admin/prizes', icon: Gift, label: 'Hadiah' },
    { to: '/admin/participants', icon: Users, label: 'Peserta' },
    { to: '/admin/winners', icon: Trophy, label: 'Rekap Pemenang' },
  ];

  return (
    <div className="admin-container">
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`admin-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Spin Random Winner</h2>
          <span className="sidebar-version">Dashboard v2.0</span>
          <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 24px' }}>
          <a href="/spin" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
            <PlayCircle size={20} />
            Buka Undian
          </a>
        </div>
        <div style={{ padding: '8px 24px 16px' }}>
          <button className="btn btn-secondary btn-logout" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
        <div className="sidebar-copyright">
          © {new Date().getFullYear()} Powered by Inner Tech
        </div>
      </aside>

      <main className="admin-content">
        {/* Top bar */}
        <div className="admin-topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-root">Admin</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{breadcrumb}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-badge">
              <div className="topbar-dot" />
              <span>Online</span>
            </div>
          </div>
        </div>

        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
};

export default AdminLayout;
