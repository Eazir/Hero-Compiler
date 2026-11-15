import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          background: disabled ? 'rgba(51, 65, 85, 0.5)' : 'var(--blue-gradient)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: disabled ? 'none' : '0 2px 10px rgba(37, 99, 235, 0.35)',
        };
      case 'success':
        return {
          background: disabled ? 'rgba(51, 65, 85, 0.5)' : 'var(--green-gradient)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: disabled ? 'none' : '0 2px 10px rgba(16, 185, 129, 0.35)',
        };
      case 'danger':
        return {
          background: disabled ? 'rgba(51, 65, 85, 0.5)' : 'linear-gradient(135deg, #F43F5E, #E11D48)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: disabled ? 'none' : '0 2px 10px rgba(244, 63, 94, 0.35)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text)',
          border: '1px solid transparent',
          boxShadow: 'none',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--panel-2)',
          color: 'var(--text)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
        };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '6px 12px';
      case 'lg':
        return '12px 24px';
      case 'md':
      default:
        return '8px 16px';
    }
  };

  const colors = getColors();

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: size === 'sm' ? '36px' : '44px',
        padding: getPadding(),
        fontSize: size === 'sm' ? '0.8rem' : '0.875rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--motion-fast) cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.6 : 1,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        ...colors,
        ...style,
      }}
    >
      {children}
    </button>
  );
};
