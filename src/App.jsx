import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LoginGate from './pages/admin/LoginGate';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Settings from './pages/admin/Settings';
import Prizes from './pages/admin/Prizes';
import Participants from './pages/admin/Participants';
import Winners from './pages/admin/Winners';
import SpinScreen from './pages/spin/SpinScreen';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />

          <Route path="/admin" element={
            <LoginGate>
              <AdminLayout />
            </LoginGate>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="prizes" element={<Prizes />} />
            <Route path="participants" element={<Participants />} />
            <Route path="winners" element={<Winners />} />
          </Route>

          <Route path="/spin" element={<SpinScreen />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
