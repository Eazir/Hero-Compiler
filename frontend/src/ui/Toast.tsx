import React from 'react';

export interface ToastProps {
  message: string;
  variant?: 'info' | 'error' | 'success';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, variant = 'info', onClose }) => {
  const getColors = () => {
    switch (variant) {
      case 'error':
        return { border: 'var(--red)', bg: 'rgba(255, 111, 125, 0.15)', text: 'var(--red)' };
      case 'success':
        return { border: 'var(--green)', bg: 'rgba(94, 224, 160, 0.15)', text: 'var(--green)' };
      case 'info':
      default:
        return { border: 'var(--cyan)', bg: 'rgba(94, 212, 232, 0.15)', text: 'var(--cyan)' };
    }
  };

  const c = getColors();

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        color: c.text,
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar notificación"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1.125rem',
            lineHeight: 1,
            padding: '4px',
            minHeight: '24px',
            minWidth: '24px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
