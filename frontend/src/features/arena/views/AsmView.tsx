import React from 'react';
import { Step } from '../../../api/schema';
import { Chip } from '../../../ui/Chip';

export interface AsmInstruction {
  pc: number;
  text: string;
  fromIr?: number | null;
}

interface AsmViewProps {
  instructions: AsmInstruction[];
  stepIndex: number;
  steps: Step[];
}

export const AsmView: React.FC<AsmViewProps> = ({ instructions, stepIndex, steps }) => {
  const currentStep = steps[stepIndex];
  const activeAsmText = currentStep?.ops?.find((op) => op.op === 'emit')?.asm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Instrucciones de Ensamblador ISA ({instructions.length}):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {Math.max(1, steps.length)}
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
        {instructions.map((ins, idx) => {
          const isActive = activeAsmText === ins.text || idx === stepIndex;
          const isEmitted = idx <= stepIndex || stepIndex >= steps.length - 1;

          return (
            <div
              key={ins.pc}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: isActive
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isEmitted
                  ? 'rgba(15, 23, 42, 0.7)'
                  : 'rgba(15, 23, 42, 0.25)',
                border: isActive ? '1px solid var(--green)' : '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                opacity: isEmitted ? 1 : 0.45,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-mono)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem', width: '44px' }}>
                  PC={ins.pc}
                </span>
                <strong style={{ color: isActive ? '#FFFFFF' : 'var(--text-pure)', fontSize: '0.95rem' }}>
                  {ins.text}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {ins.fromIr !== null && ins.fromIr !== undefined && (
                  <Chip label={`TAC [${ins.fromIr}]`} variant="cyan" />
                )}
                {isActive && <Chip label="Asignado" variant="green" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
