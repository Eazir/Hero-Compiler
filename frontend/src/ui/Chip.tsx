import React from 'react';

export interface ChipProps {
  label: string;
  variant?: 'amber' | 'cyan' | 'violet' | 'green' | 'red' | 'default' | 'blue';
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'default' }) => {
  const getStyle = () => {
    switch (variant) {
      case 'green':
        return {
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'blue':
      case 'cyan':
      case 'amber':
        return {
          color: '#38BDF8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          bg: 'rgba(37, 99, 235, 0.12)',
        };
      case 'violet':
        return {
          color: '#A5B4FC',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          bg: 'rgba(99, 102, 241, 0.12)',
        };
      case 'red':
        return {
          color: '#FB7185',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          bg: 'rgba(244, 63, 94, 0.12)',
        };
      case 'default':
      default:
        return {
          color: 'var(--muted-light)',
          border: '1px solid var(--line)',
          bg: 'var(--panel-2)',
        };
    }
  };

  const s = getStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: s.bg,
        color: s.color,
        border: s.border,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
};
