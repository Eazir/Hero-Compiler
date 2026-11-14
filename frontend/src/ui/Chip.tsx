import React from 'react';

export interface ChipProps {
  label: string;
  variant?: 'amber' | 'cyan' | 'violet' | 'green' | 'red' | 'default';
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'default' }) => {
  const getStyle = () => {
    switch (variant) {
      case 'amber':
        return { color: 'var(--amber)', border: '1px solid var(--amber)', bg: 'rgba(255, 184, 77, 0.1)' };
      case 'cyan':
        return { color: 'var(--cyan)', border: '1px solid var(--cyan)', bg: 'rgba(94, 212, 232, 0.1)' };
      case 'violet':
        return { color: 'var(--violet)', border: '1px solid var(--violet)', bg: 'rgba(167, 139, 250, 0.1)' };
      case 'green':
        return { color: 'var(--green)', border: '1px solid var(--green)', bg: 'rgba(94, 224, 160, 0.1)' };
      case 'red':
        return { color: 'var(--red)', border: '1px solid var(--red)', bg: 'rgba(255, 111, 125, 0.1)' };
      case 'default':
      default:
        return { color: 'var(--muted)', border: '1px solid var(--line)', bg: 'var(--panel-2)' };
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
      }}
    >
      {label}
    </span>
  );
};

