import React from 'react';
import { Step } from '../../api/schema';
import { Chip } from '../../ui/Chip';

interface ExplainPanelProps {
  step: Step | null;
  stepIndex: number;
  totalSteps: number;
}

export const ExplainPanel: React.FC<ExplainPanelProps> = ({ step, stepIndex, totalSteps }) => {
  if (!step) {
    return (
      <div
        role="region"
        aria-live="polite"
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--muted)',
          fontSize: '0.9rem',
          fontStyle: 'italic',
        }}
      >
        No hay pasos disponibles en esta fase.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Panel de explicación del paso actual"
      aria-live="polite"
      aria-atomic="true"
      style={{
        padding: '18px 22px',
        backgroundColor: 'var(--panel-solid)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Chip label={`Paso ${stepIndex + 1} / ${totalSteps}`} variant="blue" />
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-pure)',
              letterSpacing: '-0.01em',
            }}
          >
            {step.title}
          </h4>
        </div>

        {step.focus?.span && (
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--blue-bright)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            Línea {step.focus.span.line}, Col {step.focus.span.col} (longitud {step.focus.span.len})
          </span>
        )}
      </div>

      <p
        style={{
          color: 'var(--text)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
        }}
      >
        {step.explain}
      </p>

      {/* Operaciones del paso si las hay */}
      {step.ops && step.ops.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {step.ops.map((op, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: op.op === 'fail' ? 'var(--red)' : op.op === 'declare' ? 'var(--green-bright)' : 'var(--blue-bright)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--line)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {op.op.toUpperCase()}: {JSON.stringify(op).slice(0, 50)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
