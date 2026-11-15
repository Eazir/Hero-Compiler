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
          border: '1px solid var(--blue-bright)',
          color: '#FFFFFF',
          bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(56, 189, 248, 0.15))',
          dot: 'var(--blue-bright)',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(37, 99, 235, 0.25)',
        };
      case 'done':
        return {
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: 'var(--text)',
          bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.08))',
          dot: 'var(--green-vibrant)',
          cursor: 'pointer',
          boxShadow: 'none',
        };
      case 'error':
        return {
          border: '1px solid var(--red)',
          color: 'var(--red)',
          bg: 'rgba(244, 63, 94, 0.12)',
          dot: 'var(--red)',
          cursor: 'pointer',
          boxShadow: 'none',
        };
      case 'locked':
      default:
        return {
          border: '1px solid var(--line)',
          color: 'var(--muted)',
          bg: 'rgba(15, 23, 42, 0.4)',
          dot: 'var(--line)',
          cursor: 'not-allowed',
          boxShadow: 'none',
        };
    }
  };

  return (
    <nav aria-label="Progreso de las 7 fases del compilador" style={{ width: '100%', overflowX: 'auto' }}>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
          gap: '10px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          minWidth: 0,
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
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: s.bg,
                border: s.border,
                color: s.color,
                boxShadow: s.boxShadow,
                cursor: s.cursor,
                transition: 'all var(--motion-fast) ease',
                userSelect: 'none',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    opacity: 0.7,
                  }}
                >
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
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
