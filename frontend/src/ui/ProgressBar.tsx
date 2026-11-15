import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'var(--panel-2)',
          borderRadius: '9999px',
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: 'var(--amber)',
            borderRadius: '9999px',
            transition: 'width var(--motion-normal) ease',
          }}
        />
      </div>
    </div>
  );
};
