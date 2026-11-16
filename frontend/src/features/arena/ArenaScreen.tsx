import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PHASES_META } from '../../domain/phases';
import { es } from '../../i18n/es';
import { useCompileStore } from '../../state/compileStore';
import { usePlayerStore } from '../../state/playerStore';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Panel } from '../../ui/Panel';
import { ExplainPanel } from './ExplainPanel';
import { PhasePlayer } from './PhasePlayer';
import { PhaseStepper } from './PhaseStepper';
import { AstView } from './views/AstView';
import { IrView } from './views/IrView';
import { OptView } from './views/OptView';
import { SymbolsView } from './views/SymbolsView';
import { TokensView } from './views/TokensView';

export const ArenaScreen: React.FC = () => {
  const navigate = useNavigate();
  const { trace } = useCompileStore();
  const {
    activePhase,
    stepIndex,
    setActivePhase,
  } = usePlayerStore();

  // Guardia de navegación: sin traza redirige a /
  if (!trace) {
    return <Navigate to="/" replace />;
  }

  const currentPhaseData = trace.phases.find((p) => p.id === activePhase);
  const donePhases = trace.phases.filter((p) => p.status === 'ok').map((p) => p.id);
  const errorPhase = trace.phases.find((p) => p.status === 'error')?.id || null;

  const totalSteps = currentPhaseData?.steps.length || 0;
  const currentStep = totalSteps > 0 && currentPhaseData?.steps[stepIndex]
    ? currentPhaseData.steps[stepIndex]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, maxWidth: '100%' }}>
      {/* Encabezado con navegación */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-pure)',
              letterSpacing: '-0.02em',
            }}
          >
            {es.app.nav.arena}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Animación paso a paso de las fases del compilador MiniArit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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

      {/* Stepper horizontal de las 7 fases */}
      <PhaseStepper
        phases={PHASES_META}
        active={activePhase}
        done={donePhases}
        errorPhase={errorPhase}
        onSelectPhase={(phase) => setActivePhase(phase)}
      />

      {/* Reproductor interactivo 1 a 1 de la fase actual */}
      {currentPhaseData && (
        <PhasePlayer
          totalSteps={totalSteps}
          phaseName={currentPhaseData.name}
        />
      )}

      {/* Panel de explicación del paso actual con accesibilidad aria-live="polite" */}
      <ExplainPanel
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
      />

      {/* Vista interactiva específica según la fase activa */}
      {currentPhaseData && (
        <Panel
          title={`${currentPhaseData.name} — Visualización`}
          badge={
            <Chip
              label={currentPhaseData.status.toUpperCase()}
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
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
            {currentPhaseData.summary}
          </p>

          {/* 1. Vista de Tokens (Léxico) */}
          {activePhase === 'lexical' && currentPhaseData.output?.tokens && (
            <TokensView
              tokens={currentPhaseData.output.tokens}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 2. Vista de AST (Sintáctico) */}
          {activePhase === 'syntactic' && currentPhaseData.output?.ast && (
            <AstView
              ast={currentPhaseData.output.ast}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 3. Vista de Tabla de Símbolos (Semántico) */}
          {activePhase === 'semantic' && currentPhaseData.output && (
            <SymbolsView
              symbols={currentPhaseData.output.symbols || []}
              warnings={currentPhaseData.output.warnings || []}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 4. Vista de Código Intermedio TAC (Fase 4) */}
          {activePhase === 'ir' && currentPhaseData.output?.instructions && (
            <IrView
              instructions={currentPhaseData.output.instructions}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 5. Vista de Optimización (Fase 4) */}
          {activePhase === 'optimization' && currentPhaseData.output?.instructions && (
            <OptView
              instructions={currentPhaseData.output.instructions}
              passes={currentPhaseData.output.passes || []}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* Fases 5-7: Resumen e información preliminar */}
          {!['lexical', 'syntactic', 'semantic', 'ir', 'optimization'].includes(activePhase) && (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--muted)',
                backgroundColor: 'var(--panel-2)',
                borderRadius: 'var(--radius-md)',
                fontStyle: 'italic',
              }}
            >
              Visualización especializada de {currentPhaseData.name} lista para las fases F5 a F7.
            </div>
          )}
        </Panel>
      )}
    </div>
  );
};
