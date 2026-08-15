import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

let toastId = 0;

const ICONS = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

const ToastItem = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 350);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div className={`toast-item toast-${toast.type} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-icon">{ICONS[toast.type]}</div>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={handleClose}>
        <X size={16} />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${toast.duration || 3500}ms` }} />
    </div>
  );
};

// Confirm dialog component
const ConfirmDialog = ({ dialog, onResolve }) => {
  const [exiting, setExiting] = useState(false);

  const handleResolve = (result) => {
    setExiting(true);
    setTimeout(() => onResolve(result), 250);
  };

  return (
    <div className={`confirm-overlay ${exiting ? 'confirm-overlay-exit' : ''}`}>
      <div className={`confirm-dialog ${exiting ? 'confirm-dialog-exit' : ''}`}>
        <div className="confirm-icon-wrap">
          <div className={`confirm-icon confirm-icon-${dialog.type || 'warning'}`}>
            {dialog.type === 'danger' ? <AlertTriangle size={32} /> : <AlertTriangle size={32} />}
          </div>
        </div>
        <h3 className="confirm-title">{dialog.title || 'Konfirmasi'}</h3>
        <p className="confirm-message">{dialog.message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary confirm-btn" onClick={() => handleResolve(false)}>
            {dialog.cancelText || 'Batal'}
          </button>
          <button
            className={`btn confirm-btn ${dialog.type === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={() => handleResolve(true)}
          >
            {dialog.confirmText || 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const addToast = useCallback((type, message, options = {}) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message, ...options }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, opts) => addToast('success', msg, opts),
    error: (msg, opts) => addToast('error', msg, opts),
    warning: (msg, opts) => addToast('warning', msg, opts),
    info: (msg, opts) => addToast('info', msg, opts),
  };

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const handleConfirmResolve = (result) => {
    if (confirmState?.resolve) confirmState.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
      {confirmState && (
        <ConfirmDialog dialog={confirmState} onResolve={handleConfirmResolve} />
      )}
    </ToastContext.Provider>
  );
};
