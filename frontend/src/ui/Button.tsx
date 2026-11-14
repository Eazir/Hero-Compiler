import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
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
          backgroundColor: disabled ? 'var(--line)' : 'var(--amber)',
          color: '#0F1424',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: disabled ? 'var(--line)' : 'var(--red)',
          color: '#ffffff',
          borderColor: 'transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text)',
          borderColor: 'transparent',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: 'var(--panel-2)',
          color: 'var(--text)',
          borderColor: 'var(--line)',
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
        return '10px 18px';
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
        minHeight: '44px',
        minWidth: '44px',
        padding: getPadding(),
        fontSize: size === 'sm' ? '0.875rem' : '1rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${colors.borderColor}`,
        backgroundColor: colors.backgroundColor,
        color: colors.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity var(--motion-fast) ease, transform var(--motion-fast) ease',
        opacity: disabled ? 0.6 : 1,
        fontFamily: 'var(--font-ui)',
        ...style,
      }}
    >
      {children}
    </button>
  );
};
