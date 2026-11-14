import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  badge?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, badge, children, style, ...props }) => {
  return (
    <div
      {...props}
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      {(title || badge) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '12px',
          }}
        >
          {title && <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>{title}</h3>}
          {badge}
        </div>
      )}
      {children}
    </div>
  );
};
