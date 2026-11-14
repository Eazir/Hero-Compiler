import React from 'react';

export type BlockType = 'variable' | 'number' | 'operation' | 'assign' | 'print';

export interface BlockProps {
  type: BlockType;
  label: string;
  onClick?: () => void;
}

export const Block: React.FC<BlockProps> = ({ type, label, onClick }) => {
  const getColor = () => {
    switch (type) {
      case 'variable':
        return 'var(--cyan)';
      case 'number':
        return 'var(--violet)';
      case 'operation':
        return 'var(--amber)';
      case 'assign':
        return 'var(--blue)';
      case 'print':
        return 'var(--green)';
    }
  };

  const color = getColor();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        minHeight: '44px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${color}`,
        backgroundColor: 'rgba(22, 28, 48, 0.9)',
        color: color,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
};
