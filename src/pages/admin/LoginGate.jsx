import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

const DEFAULT_PIN = '1234';
const SESSION_KEY = 'spin_admin_auth';
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

export const isAuthenticated = () => {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!session) return false;
    return Date.now() - session.timestamp < SESSION_DURATION;
  } catch {
    return false;
  }
};

export const setAuthenticated = () => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
};

export const clearAuth = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

const LoginGate = ({ children }) => {
  const [authenticated, setAuthState] = useState(isAuthenticated());
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  // Get stored PIN or use default
  const getStoredPin = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('spin_settings'));
      return settings?.adminPin || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  };

  useEffect(() => {
    if (!authenticated) {
      inputRefs.current[0]?.focus();
    }
  }, [authenticated]);

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      setTimeout(() => verifyPin(fullPin), 150);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      verifyPin(pin.join(''));
    }
  };

  const verifyPin = (fullPin) => {
    const storedPin = getStoredPin();
    if (fullPin === storedPin) {
      setSuccess(true);
      setAuthenticated();
      setTimeout(() => setAuthState(true), 800);
    } else {
      setError('PIN salah, coba lagi');
      setShake(true);
      setPin(['', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  if (authenticated) return children;

  return (
    <div className="login-gate">
      <div className="login-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="login-particle" style={{
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--size': `${2 + Math.random() * 4}px`,
            '--duration': `${15 + Math.random() * 25}s`,
            '--delay': `${Math.random() * 10}s`,
          }} />
        ))}
      </div>

      <div className={`login-card ${success ? 'login-success' : ''} ${shake ? 'login-shake' : ''}`}>
        <div className="login-icon-wrap">
          <div className={`login-icon ${success ? 'login-icon-success' : ''}`}>
            {success ? <ShieldCheck size={36} /> : <Lock size={36} />}
          </div>
        </div>
        
        <h1 className="login-title">Admin Panel</h1>
        <p className="login-subtitle">Masukkan PIN untuk mengakses dashboard</p>

        <div className="pin-inputs">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`pin-input ${digit ? 'pin-filled' : ''} ${error ? 'pin-error' : ''}`}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <p className="login-error">{error}</p>
        )}

        <button
          className="btn btn-primary login-btn"
          onClick={() => verifyPin(pin.join(''))}
          disabled={pin.some(d => !d)}
        >
          Masuk <ArrowRight size={18} />
        </button>

        <p className="login-hint">Default PIN: 1234</p>

        <div className="login-brand">
          <span>Spin Random Winner</span>
          <span className="login-brand-sub">by Inner Tech</span>
        </div>
      </div>
    </div>
  );
};

export default LoginGate;
