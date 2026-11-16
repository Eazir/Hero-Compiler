import React from 'react';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';

export interface GameMistakeFeedback {
  phaseName: string;
  stepTitle: string;
  whatWentWrong: string;
  whatShouldBeDone: string;
  userAnswer: string;
}

interface ErrorFeedbackModalProps {
  feedback: GameMistakeFeedback | null;
  onClose: () => void;
}

export const ErrorFeedbackModal: React.FC<ErrorFeedbackModalProps> = ({ feedback, onClose }) => {
  if (!feedback) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-error-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(6, 13, 26, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(145deg, rgba(15, 29, 54, 0.98), rgba(10, 20, 38, 0.98))',
          border: '2px solid var(--red)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 28px rgba(244, 63, 94, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }} aria-hidden="true">
              ⚠️
            </span>
            <div>
              <h3
                id="hero-error-modal-title"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                ¡Fallo en el Proceso del Compilador!
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Fase: {feedback.phaseName} &bull; {feedback.stepTitle}
              </span>
            </div>
          </div>
          <Chip label="Diagnóstico Hero" variant="red" />
        </div>

        {/* Tu respuesta */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            fontSize: '0.85rem',
            color: 'var(--text-pure)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <strong>Tu elección:</strong> {feedback.userAnswer}
        </div>

        {/* Qué error se cometió */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.08)',
            borderLeft: '4px solid var(--red)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <strong style={{ color: 'var(--red)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ❌ ¿Qué error se cometió?
          </strong>
          <p style={{ color: 'var(--text)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
            {feedback.whatWentWrong}
          </p>
        </div>

        {/* Qué se debió hacer */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderLeft: '4px solid var(--green)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <strong style={{ color: 'var(--green)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✅ ¿Qué se debió hacer?
          </strong>
          <p style={{ color: 'var(--text-pure)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
            {feedback.whatShouldBeDone}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="primary" onClick={onClose}>
            Entendido, corregir paso
          </Button>
        </div>
      </div>
    </div>
  );
};
