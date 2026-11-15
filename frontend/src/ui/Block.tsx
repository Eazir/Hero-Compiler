import React from 'react';

export type BlockType = 'variable' | 'number' | 'operation' | 'assign' | 'print';

export interface BlockProps {
  type: BlockType;
  label: string;
  onClick?: () => void;
}

export const Block: React.FC<BlockProps> = ({ type, label, onClick }) => {
  const getStyle = () => {
    switch (type) {
      case 'variable':
        return {
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
        };
      case 'number':
        return {
          color: '#6EE7B7',
          bg: 'rgba(110, 231, 183, 0.1)',
          border: '1px solid rgba(110, 231, 183, 0.35)',
        };
      case 'operation':
        return {
          color: '#60A5FA',
          bg: 'rgba(96, 165, 250, 0.1)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
        };
      case 'assign':
        return {
          color: '#93C5FD',
          bg: 'rgba(37, 99, 235, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
        };
      case 'print':
        return {
          color: '#34D399',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
        };
    }
  };

  const style = getStyle();

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
        padding: '6px 14px',
        minHeight: '44px',
        borderRadius: 'var(--radius-md)',
        border: style.border,
        backgroundColor: style.bg,
        color: style.color,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all var(--motion-fast) ease',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
};
