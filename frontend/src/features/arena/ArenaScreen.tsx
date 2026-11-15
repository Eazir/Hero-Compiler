import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCompileStore } from '../../state/compileStore';
import { PHASES_META } from '../../domain/phases';
import { PhaseId } from '../../api/schema';
import { PhaseStepper } from './PhaseStepper';
import { Panel } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { es } from '../../i18n/es';

export const ArenaScreen: React.FC = () => {
  const navigate = useNavigate();
  const { trace } = useCompileStore();
  const [selectedPhase, setSelectedPhase] = useState<PhaseId>('lexical');

  // Guardia de navegación: sin traza redirige a /
  if (!trace) {
    return <Navigate to="/" replace />;
  }

  const currentPhaseData = trace.phases.find((p) => p.id === selectedPhase);
  const donePhases = trace.phases.filter((p) => p.status === 'ok').map((p) => p.id);
  const errorPhase = trace.phases.find((p) => p.status === 'error')?.id || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {es.app.nav.arena}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Reproducción paso a paso de las 7 fases del compilador MiniArit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ← Volver al Editor
          </Button>
          {trace.ok && (
            <Button variant="primary" size="sm" onClick={() => navigate('/resultado')}>
              Ver Resultado →
            </Button>
          )}
        </div>
      </header>

      {/* Stepper interactivo de las 7 fases */}
      <PhaseStepper
        phases={PHASES_META}
        active={selectedPhase}
        done={donePhases}
        errorPhase={errorPhase}
        onSelectPhase={(phase) => setSelectedPhase(phase)}
      />

      {/* Detalle y explicación de la fase seleccionada */}
      {currentPhaseData && (
        <Panel
          title={`${currentPhaseData.name} — Detalle de la Fase`}
          badge={
            <Chip
              label={`Status: ${currentPhaseData.status.toUpperCase()}`}
              variant={
                currentPhaseData.status === 'ok'
                  ? 'green'
                  : currentPhaseData.status === 'error'
                  ? 'red'
                  : 'default'
              }
            />
          }
        >
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{currentPhaseData.summary}</p>

          {/* Si estamos en fase léxica y hay tokens, mostrar vista de tokens */}
          {selectedPhase === 'lexical' && currentPhaseData.output?.tokens && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Tokens Identificados ({currentPhaseData.output.tokens.length}):
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentPhaseData.output.tokens.map((tok: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--panel-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{tok.type}</span>
                    <strong style={{ color: 'var(--amber)' }}>{tok.lexeme === '\n' ? '\\n' : tok.lexeme || 'EOF'}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>L{tok.line}:C{tok.col}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pasos de traza registrados */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--amber)', textTransform: 'uppercase' }}>
              Traza Paso a Paso ({currentPhaseData.steps.length} pasos):
            </h4>
            {currentPhaseData.steps.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Esta fase no registró pasos o fue omitida.
              </p>
            ) : (
              currentPhaseData.steps.map((st) => (
                <div
                  key={st.i}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--panel-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text)' }}>#{st.i + 1} {st.title}</strong>
                    {st.focus?.span && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        Línea {st.focus.span.line}, Col {st.focus.span.col}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--muted)', marginTop: '4px' }}>{st.explain}</p>
                </div>
              ))
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};
