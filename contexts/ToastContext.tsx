import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '@/components/Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmData, setConfirmData] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const showSuccess = (message: string) => showToast(message, 'success');
  const showError = (message: string) => showToast(message, 'error');
  const showWarning = (message: string) => showToast(message, 'warning');
  const showInfo = (message: string) => showToast(message, 'info');

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmData({ message, resolve });
    });
  };

  const handleConfirm = (value: boolean) => {
    if (confirmData) {
      confirmData.resolve(value);
      setConfirmData(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, confirm }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
      {confirmData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => handleConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              margin: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, color: '#333', marginBottom: 24 }}>{confirmData.message}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#4A90E2',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

