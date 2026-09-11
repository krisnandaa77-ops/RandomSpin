import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import './AppLockGate.css';

const DEFAULT_PIN = '1234';
const STORAGE_STAGE_KEY = 'spin_app_lock_stage';
const STORAGE_BYPASS_KEY = 'spin_app_lock_bypass';

const AppLockGate = ({ children }) => {
  // Check if developer bypass is active
  const isBypassed = () => {
    try {
      return localStorage.getItem(STORAGE_BYPASS_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const getSavedStage = () => {
    if (isBypassed()) return 'UNLOCKED';
    try {
      const saved = sessionStorage.getItem(STORAGE_STAGE_KEY);
      if (
        saved === 'ERROR_404' ||
        saved === 'ALERT_FATAL' ||
        saved === 'ALERT_TEXT' ||
        saved === 'ALERT_IMAGE'
      ) {
        return 'ERROR_404';
      }
    } catch {
      // fallback
    }
    return 'PIN';
  };

  // Stages: 'PIN' | 'ERROR_404' | 'UNLOCKED'
  const [stage, setStage] = useState(getSavedStage);
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [bypassToast, setBypassToast] = useState('');
  const inputRefs = useRef([]);
  const click404CountRef = useRef(0);
  const click404TimerRef = useRef(null);

  // Get configured PIN or default
  const getExpectedPin = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('spin_settings'));
      return settings?.adminPin || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  };

  // Global keyboard shortcuts:
  // Ctrl + Alt + Shift + U -> Unlock
  // Ctrl + Alt + Shift + L -> Re-lock
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey) {
        if (e.key === 'U' || e.key === 'u') {
          e.preventDefault();
          localStorage.setItem(STORAGE_BYPASS_KEY, 'true');
          sessionStorage.removeItem(STORAGE_STAGE_KEY);
          setStage('UNLOCKED');
          showToast('Developer Bypass: Terbuka');
        } else if (e.key === 'L' || e.key === 'l') {
          e.preventDefault();
          localStorage.removeItem(STORAGE_BYPASS_KEY);
          sessionStorage.removeItem(STORAGE_STAGE_KEY);
          setStage('PIN');
          setPin(['', '', '', '']);
          showToast('Security Lock: Diaktifkan kembali');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  const showToast = (msg) => {
    setBypassToast(msg);
    setTimeout(() => setBypassToast(''), 3000);
  };

  // Focus first input on mount if in PIN stage
  useEffect(() => {
    if (stage === 'PIN') {
      inputRefs.current[0]?.focus();
    }
  }, [stage]);

  // Handle PIN typing
  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

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
    const expected = getExpectedPin();
    if (fullPin === expected) {
      setIsSuccess(true);
      setError('');
      setTimeout(() => {
        setStage('ERROR_404');
        sessionStorage.setItem(STORAGE_STAGE_KEY, 'ERROR_404');
      }, 700);
    } else {
      setError('PIN salah, silakan coba lagi');
      setShake(true);
      setPin(['', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 450);
    }
  };

  // Secret trigger: Klik "404" sebanyak 20 kali untuk membuka
  const handle404Click = () => {
    click404CountRef.current += 1;

    if (click404TimerRef.current) {
      clearTimeout(click404TimerRef.current);
    }

    if (click404CountRef.current >= 20) {
      click404CountRef.current = 0;
      localStorage.setItem(STORAGE_BYPASS_KEY, 'true');
      sessionStorage.removeItem(STORAGE_STAGE_KEY);
      setStage('UNLOCKED');
      showToast('Akses Berhasil Dibuka (20x Klik Terverifikasi)');
      return;
    }

    // Reset hitungan jika jeda lebih dari 4 detik
    click404TimerRef.current = setTimeout(() => {
      click404CountRef.current = 0;
    }, 4000);
  };

  return (
    <div className="app-lock-root">
      {/* Developer Toast */}
      {bypassToast && (
        <div className="lock-bypass-toast">
          {bypassToast}
        </div>
      )}

      {/* STAGE 1: FULL SCREEN PIN LOCK */}
      {stage === 'PIN' && (
        <div className="app-lock-container">
          <div className="app-lock-particles">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="app-lock-particle"
                style={{
                  left: `${(i * 19 + 7) % 100}%`,
                  top: `${(i * 23 + 11) % 100}%`,
                  width: `${3 + (i % 4) * 2}px`,
                  height: `${3 + (i % 4) * 2}px`,
                  '--duration': `${12 + (i % 8) * 3}s`,
                  '--delay': `${(i % 5) * 1.5}s`,
                }}
              />
            ))}
          </div>

          <div className={`app-lock-card ${isSuccess ? 'lock-success' : ''} ${shake ? 'lock-shake' : ''}`}>
            <div
              className={`app-lock-icon-badge ${isSuccess ? 'success' : ''}`}
              title="Aplikasi Terkunci"
            >
              {isSuccess ? <ShieldCheck size={40} /> : <Lock size={40} />}
            </div>

            <h1 className="app-lock-title">Aplikasi Terkunci</h1>
            <p className="app-lock-desc">Masukkan PIN keamanan untuk mengakses sistem</p>

            <div className="app-lock-pin-row">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`app-lock-pin-digit ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
                  autoComplete="off"
                />
              ))}
            </div>

            <div className="app-lock-curent-hint">
              curent password 1234
            </div>

            {error && <div className="app-lock-error-text">{error}</div>}

            <button
              className="app-lock-submit-btn"
              onClick={() => verifyPin(pin.join(''))}
              disabled={pin.some((d) => !d) || isSuccess}
            >
              {isSuccess ? 'Memverifikasi...' : 'Buka Akses'} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: PURE CLASSIC SERVER 404 NOT FOUND (20-CLICK SECRET UNLOCK) */}
      {stage === 'ERROR_404' && (
        <div className="server-404-screen">
          <div className="server-404-container">
            <h1
              className="server-404-title"
              onClick={handle404Click}
              title=""
            >
              404 Not Found
            </h1>
            <hr className="server-404-hr" />
            <div className="server-404-server">nginx/1.24.0 (Ubuntu)</div>
          </div>
        </div>
      )}

      {/* STAGE 3: UNLOCKED - RENDER APPLICATION */}
      {stage === 'UNLOCKED' && children}
    </div>
  );
};

export default AppLockGate;
