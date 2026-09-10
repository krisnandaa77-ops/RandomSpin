import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import suspiciousCatImg from '../assets/suspicious-cat.jpg';
import speedMemeImg from '../assets/speed-meme.jpg';
import { playSuspiciousSound } from '../utils/sounds';
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
      if (saved === 'ALERT_FATAL') return 'ALERT_FATAL';
      if (saved === 'ALERT_TEXT') return 'ALERT_TEXT';
      if (saved === 'ALERT_IMAGE') return 'ALERT_IMAGE';
    } catch {
      // fallback
    }
    return 'PIN';
  };

  // Stages: 'PIN' | 'ALERT_IMAGE' (Alert 1) | 'ALERT_TEXT' (Alert 2) | 'ALERT_FATAL' (Alert 3) | 'UNLOCKED'
  const [stage, setStage] = useState(getSavedStage);
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [bypassToast, setBypassToast] = useState('');
  const inputRefs = useRef([]);
  const secretClickCountRef = useRef(0);
  const secretTimerRef = useRef(null);

  // Play suspicious sound when entering ALERT_IMAGE
  useEffect(() => {
    if (stage === 'ALERT_IMAGE') {
      playSuspiciousSound();
    }
  }, [stage]);

  // Get configured PIN or default
  const getExpectedPin = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('spin_settings'));
      return settings?.adminPin || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  };

  // Keyboard shortcut for developer bypass: Ctrl + Alt + Shift + U to unlock, Ctrl + Alt + Shift + L to re-lock
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Block Escape key when on ALERT_FATAL to prevent any modal escaping
      if (stage === 'ALERT_FATAL' && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }

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
  }, [stage]);

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
        setStage('ALERT_IMAGE');
        sessionStorage.setItem(STORAGE_STAGE_KEY, 'ALERT_IMAGE');
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

  // Close Alert 1 (Image) -> Advances to Alert 2 (Text)
  const handleCloseAlertImage = () => {
    setStage('ALERT_TEXT');
    sessionStorage.setItem(STORAGE_STAGE_KEY, 'ALERT_TEXT');
  };

  // Close Alert 2 (Text) -> Advances to Alert 3 (Fatal Lockout)
  const handleCloseAlertText = () => {
    setStage('ALERT_FATAL');
    sessionStorage.setItem(STORAGE_STAGE_KEY, 'ALERT_FATAL');
  };

  // Secret click trigger (clicking lock icon 5 times in 2.5s)
  const handleSecretIconClick = () => {
    secretClickCountRef.current += 1;
    if (secretTimerRef.current) clearTimeout(secretTimerRef.current);

    if (secretClickCountRef.current >= 5) {
      secretClickCountRef.current = 0;
      localStorage.setItem(STORAGE_BYPASS_KEY, 'true');
      sessionStorage.removeItem(STORAGE_STAGE_KEY);
      setStage('UNLOCKED');
      showToast('Developer Bypass Activated');
      return;
    }

    secretTimerRef.current = setTimeout(() => {
      secretClickCountRef.current = 0;
    }, 2500);
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
              onClick={handleSecretIconClick}
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

      {/* RENDER THE APP IN THE BACKGROUND (Accessible once past PIN, but blocked by alerts) */}
      {stage !== 'PIN' && children}

      {/* ALERT 1: IMAGE ONLY MODAL (WITH [X] AND SUSPICIOUS SOUND) */}
      {stage === 'ALERT_IMAGE' && (
        <div className="app-lock-overlay" onClick={handleCloseAlertImage}>
          <div className="lock-image-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button 'X' */}
            <button
              className="lock-alert-close-btn"
              onClick={handleCloseAlertImage}
              aria-label="Tutup"
              title="Tutup"
            >
              <X size={20} />
            </button>

            <img
              src={suspiciousCatImg}
              alt="Suspicious Cat Meme"
              className="lock-image-preview"
            />
          </div>
        </div>
      )}

      {/* ALERT 2: TEXT GREETING MODAL (DISMISSIBLE WITH 'X') */}
      {stage === 'ALERT_TEXT' && (
        <div className="app-lock-overlay" onClick={handleCloseAlertText}>
          <div className="lock-alert-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button 'X' */}
            <button
              className="lock-alert-close-btn"
              onClick={handleCloseAlertText}
              aria-label="Tutup"
              title="Tutup"
            >
              <X size={20} />
            </button>

            <div className="lock-alert-icon-wrap">
              <Sparkles size={32} />
            </div>

            <span className="lock-alert-badge">Pemberitahuan</span>
            <h2 className="lock-alert-title">HALO!</h2>
            <div className="lock-alert-message">
              SEMANGAT YA BEKERJANYA GUYSS.
            </div>

            <button className="lock-alert-action-btn" onClick={handleCloseAlertText}>
              OKE
            </button>
          </div>
        </div>
      )}

      {/* ALERT 3: FATAL LOCKOUT (PERMANENT BLOCKER, NO 'X', LOCKS ENTIRE WEB) */}
      {stage === 'ALERT_FATAL' && (
        <div
          className="lock-fatal-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className="lock-fatal-modal"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Notice: No X / Close button provided! */}
            <div
              className="lock-fatal-icon-wrap"
              onClick={handleSecretIconClick}
              title="System Alert"
            >
              <ShieldAlert size={46} />
            </div>

            <div className="lock-fatal-badge">
              <span className="lock-fatal-badge-dot"></span>
              SISTEM DIBATASI
            </div>

            <h2 className="lock-fatal-title">AKSES DINONAKTIFKAN</h2>

            <div className="lock-fatal-image-wrap">
              <img
                src={speedMemeImg}
                alt="Developer Speed Meme"
                className="lock-fatal-image"
              />
            </div>

            <div className="lock-fatal-message">
              "KATA GW SIH LU MENDING REKRUT DEVELOPER YANG BISA BUAT KAYAK GINI"
            </div>

            <div className="lock-fatal-footer">
              <div className="lock-fatal-lock-status">
                <Lock size={14} /> SELURUH INTERAKSI HALAMAN TELAH DIKUNCI
              </div>
              <span>Hubungi administrator untuk pemulihan akses sistem</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLockGate;
