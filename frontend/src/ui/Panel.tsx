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
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minWidth: 0,
        maxWidth: '100%',
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
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {title && (
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'var(--text-pure)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
          )}
          {badge}
        </div>
      )}
      <div style={{ minWidth: 0, maxWidth: '100%' }}>{children}</div>
    </div>
  );
};
