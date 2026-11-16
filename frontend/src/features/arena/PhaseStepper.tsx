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
          border: '1px solid var(--line-focus)',
          color: 'var(--text-pure)',
          bg: 'var(--panel-3)',
          dot: 'var(--blue-bright)',
          cursor: 'pointer',
        };
      case 'done':
        return {
          border: '1px solid transparent',
          color: 'var(--text)',
          bg: 'transparent',
          dot: 'var(--green-vibrant)',
          cursor: 'pointer',
        };
      case 'error':
        return {
          border: '1px solid rgba(244, 63, 94, 0.4)',
          color: 'var(--red)',
          bg: 'var(--red-subtle)',
          dot: 'var(--red)',
          cursor: 'pointer',
        };
      case 'locked':
      default:
        return {
          border: '1px solid transparent',
          color: 'var(--muted)',
          bg: 'transparent',
          dot: 'var(--line-strong)',
          cursor: 'not-allowed',
        };
    }
  };

  return (
    <nav aria-label="Progreso de las 7 fases del compilador" style={{ width: '100%', overflowX: 'auto' }}>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
          gap: '4px',
          listStyle: 'none',
          padding: '4px',
          margin: 0,
          minWidth: 0,
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
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
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: s.bg,
                border: s.border,
                color: s.color,
                cursor: s.cursor,
                transition: 'background-color var(--motion-fast), border-color var(--motion-fast)',
                userSelect: 'none',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: s.dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: isCurrent ? 'var(--blue-bright)' : 'var(--muted)',
                  flexShrink: 0,
                }}
              >
                0{idx + 1}
              </span>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: isCurrent ? 600 : 500,
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
