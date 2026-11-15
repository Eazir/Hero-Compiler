import React from 'react';
import { PhaseId } from '../../api/schema';

export interface PhaseItem {
  id: PhaseId;
  name: string;
}

export type PhaseStepState = 'active' | 'done' | 'locked' | 'error';

export interface PhaseStepperProps {
  phases: PhaseItem[];
  active: PhaseId;
  done?: PhaseId[];
  errorPhase?: PhaseId | null;
  onSelectPhase?: (phase: PhaseId) => void;
}

export const PhaseStepper: React.FC<PhaseStepperProps> = ({
  phases,
  active,
  done = [],
  errorPhase = null,
  onSelectPhase,
}) => {
  const getPhaseState = (id: PhaseId): PhaseStepState => {
    if (errorPhase === id) return 'error';
    if (id === active) return 'active';
    if (done.includes(id)) return 'done';
    return 'locked';
  };

  const getStateStyles = (state: PhaseStepState) => {
    switch (state) {
      case 'active':
        return {
          border: 'var(--amber)',
          color: 'var(--amber)',
          bg: 'var(--panel-2)',
          dot: 'var(--amber)',
          cursor: 'pointer',
        };
      case 'done':
        return {
          border: 'var(--green)',
          color: 'var(--text)',
          bg: 'rgba(94, 224, 160, 0.08)',
          dot: 'var(--green)',
          cursor: 'pointer',
        };
      case 'error':
        return {
          border: 'var(--red)',
          color: 'var(--red)',
          bg: 'rgba(255, 111, 125, 0.1)',
          dot: 'var(--red)',
          cursor: 'pointer',
        };
      case 'locked':
      default:
        return {
          border: 'var(--line)',
          color: 'var(--muted)',
          bg: 'rgba(22, 28, 48, 0.4)',
          dot: 'var(--line)',
          cursor: 'not-allowed',
        };
    }
  };

  return (
    <nav aria-label="Progreso de las 7 fases del compilador">
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {phases.map((p, idx) => {
          const state = getPhaseState(p.id);
          const s = getStateStyles(state);
          const isCurrent = p.id === active;

          return (
            <li
              key={p.id}
              data-state={state}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => {
                if (state !== 'locked' && onSelectPhase) {
                  onSelectPhase(p.id);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && state !== 'locked' && onSelectPhase) {
                  e.preventDefault();
                  onSelectPhase(p.id);
                }
              }}
              tabIndex={state !== 'locked' ? 0 : -1}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 'var(--radius-md)',
                cursor: s.cursor,
                transition: 'border-color var(--motion-fast), background-color var(--motion-fast)',
                outline: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  0{idx + 1}
                </span>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: s.dot,
                  }}
                />
              </div>
              <strong style={{ fontSize: '0.875rem', color: s.color, fontWeight: 600 }}>
                {p.name}
              </strong>
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: s.color,
                  fontWeight: 600,
                  opacity: 0.85,
                }}
              >
                {state === 'done' ? 'Completa' : state === 'active' ? 'Activa' : state === 'error' ? 'Fallo' : 'Bloqueada'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
