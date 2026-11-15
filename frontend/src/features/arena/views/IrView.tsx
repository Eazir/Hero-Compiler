import React from 'react';
import { Step } from '../../../api/schema';
import { Chip } from '../../../ui/Chip';

export interface TacInstruction {
  index: number;
  text: string;
  fromNode?: string;
}

interface IrViewProps {
  instructions: TacInstruction[];
  stepIndex: number;
  steps: Step[];
}

export const IrView: React.FC<IrViewProps> = ({ instructions, stepIndex, steps }) => {
  const currentStep = steps[stepIndex];
  const activeEmitIndex = currentStep?.ops?.find((op) => op.op === 'emit')?.index;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Instrucciones de Código Intermedio (TAC) ({instructions.length}):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {steps.length}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {instructions.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
            No hay instrucciones intermedias generadas.
          </p>
        ) : (
          instructions.map((ins, idx) => {
            const isActive = activeEmitIndex === ins.index;
            const isEmittedYet = idx <= stepIndex || stepIndex >= instructions.length - 1;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 14px',
                  backgroundColor: isActive
                    ? 'rgba(37, 99, 235, 0.25)'
                    : isEmittedYet
                    ? 'rgba(15, 23, 42, 0.7)'
                    : 'rgba(15, 23, 42, 0.2)',
                  border: isActive
                    ? '1px solid var(--blue-bright)'
                    : '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: isEmittedYet ? 1 : 0.4,
                  boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', width: '28px' }}>
                    [{ins.index}]
                  </span>
                  <strong style={{ color: isActive ? '#FFFFFF' : 'var(--text-pure)', fontSize: '0.95rem' }}>
                    {ins.text}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ins.fromNode && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--blue-bright)',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      desde #{ins.fromNode}
                    </span>
                  )}
                  {isActive && <Chip label="Emitido ahora" variant="green" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
