import React, { useEffect } from 'react';
import { usePlayerStore } from '../../state/playerStore';
import { Button } from '../../ui/Button';
import { ProgressBar } from '../../ui/ProgressBar';

interface PhasePlayerProps {
  totalSteps: number;
  phaseName: string;
}

export const PhasePlayer: React.FC<PhasePlayerProps> = ({ totalSteps, phaseName }) => {
  const {
    stepIndex,
    isPlaying,
    speed,
    pause,
    togglePlay,
    nextStep,
    prevStep,
    skipToEnd,
    resetPhase,
    setSpeed,
  } = usePlayerStore();

  // El único reloj de la app para el reproductor de fases
  useEffect(() => {
    if (!isPlaying || totalSteps <= 1) return;

    // Verificar preferencia de movimiento reducido
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      pause();
      return;
    }

    const intervalMs = Math.round(800 / speed);
    const interval = setInterval(() => {
      if (stepIndex >= totalSteps - 1) {
        pause();
      } else {
        nextStep(totalSteps);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, stepIndex, totalSteps, speed, nextStep, pause]);

  const progressPercent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div
      role="region"
      aria-label={`Controles del reproductor para ${phaseName}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: 'var(--panel-solid)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Barra de progreso e indicador de pasos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-pure)',
            }}
          >
            Paso {totalSteps > 0 ? stepIndex + 1 : 0} de {totalSteps}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: isPlaying ? 'var(--green-bright)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {isPlaying ? '● Reproduciendo' : '⏸ En pausa'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginRight: '4px' }}>
            Velocidad:
          </span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              style={{
                background: speed === s ? 'var(--blue-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: speed === s ? '#FFFFFF' : 'var(--muted)',
                border: speed === s ? '1px solid var(--blue-bright)' : '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                transition: 'all var(--motion-fast) ease',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <ProgressBar value={progressPercent} />

      {/* Botonera de control paso a paso */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={resetPhase}
            disabled={stepIndex === 0}
            title="Reiniciar al primer paso"
          >
            ⏮ Reiniciar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={prevStep}
            disabled={stepIndex <= 0}
            title="Paso anterior (←)"
          >
            ◀ Anterior
          </Button>

          <Button
            variant={isPlaying ? 'secondary' : 'primary'}
            size="sm"
            onClick={togglePlay}
            disabled={totalSteps <= 1}
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir automáticamente (Espacio)'}
          >
            {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => nextStep(totalSteps)}
            disabled={stepIndex >= totalSteps - 1}
            title="Paso siguiente (→)"
          >
            Siguiente ▶
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => skipToEnd(totalSteps)}
          disabled={stepIndex >= totalSteps - 1}
          title="Saltar directamente al último paso"
        >
          Saltar al final ⏭
        </Button>
      </div>
    </div>
  );
};
