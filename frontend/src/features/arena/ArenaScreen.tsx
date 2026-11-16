import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PHASES_META } from '../../domain/phases';
import { es } from '../../i18n/es';
import { useCompileStore } from '../../state/compileStore';
import { usePlayerStore } from '../../state/playerStore';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Panel } from '../../ui/Panel';
import { PhaseMiniGame } from '../game/PhaseMiniGame';
import { ExplainPanel } from './ExplainPanel';
import { PhasePlayer } from './PhasePlayer';
import { PhaseStepper } from './PhaseStepper';
import { AsmView } from './views/AsmView';
import { AstView } from './views/AstView';
import { HexView } from './views/HexView';
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
    setStepIndex,
  } = usePlayerStore();

  const [heroGameActive, setHeroGameActive] = useState(true);

  // Guardia de navegación: sin traza redirige a /
  if (!trace) {
    return <Navigate to="/" replace />;
  }

  const currentPhaseData = trace.phases.find((p) => p.id === activePhase);
  const donePhases = trace.phases.filter((p) => p.status === 'ok').map((p) => p.id);
  const errorPhase = trace.phases.find((p) => p.status === 'error')?.id || null;

  const totalSteps = currentPhaseData?.steps.length || 0;
  const currentStep =
    totalSteps > 0 && currentPhaseData?.steps[stepIndex]
      ? currentPhaseData.steps[stepIndex]
      : null;

  const handleAdvanceNextPhase = () => {
    const idx = PHASES_META.findIndex((p) => p.id === activePhase);
    if (idx >= 0 && idx + 1 < PHASES_META.length) {
      setActivePhase(PHASES_META[idx + 1].id);
    } else if (trace.ok) {
      navigate('/resultado');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, maxWidth: '100%' }}>
      {/* Encabezado con navegación y selector de Modo Héroe */}
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
            Representa cada proceso del compilador en el Mini-Juego Héroe o inspecciona la animación 1 a 1.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant={heroGameActive ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setHeroGameActive((v) => !v)}
          >
            {heroGameActive ? '🎮 Mini-Juego Activo' : '🎮 Activar Mini-Juego'}
          </Button>
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

      {/* Mini-Juego Interactivo de la Fase Actual (Hero-Compiler) */}
      {heroGameActive && currentPhaseData && currentPhaseData.status === 'ok' && (
        <PhaseMiniGame
          phase={currentPhaseData}
          onCompletePhase={handleAdvanceNextPhase}
          onSyncStepIndex={(idx) => setStepIndex(idx)}
        />
      )}

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

          {/* 5. Vista de Optimización (Fase 5) */}
          {activePhase === 'optimization' && currentPhaseData.output?.instructions && (
            <OptView
              instructions={currentPhaseData.output.instructions}
              passes={currentPhaseData.output.passes || []}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 6. Vista de Ensamblador ISA (Fase 6) */}
          {activePhase === 'assembly' && currentPhaseData.output?.instructions && (
            <AsmView
              instructions={currentPhaseData.output.instructions}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}

          {/* 7. Vista Hexadecimal de 8 Bytes (Fase 7) */}
          {activePhase === 'binary' && currentPhaseData.output?.rows && (
            <HexView
              hex={currentPhaseData.output.hex || ''}
              size={currentPhaseData.output.size || 0}
              rows={currentPhaseData.output.rows}
              stepIndex={stepIndex}
              steps={currentPhaseData.steps}
            />
          )}
        </Panel>
      )}
    </div>
  );
};
