import React from 'react';
import { Step } from '../../../api/schema';
import { Chip } from '../../../ui/Chip';

export interface OptInstruction {
  index: number;
  text: string;
}

export interface OptPass {
  name: string;
  changes: number;
}

interface OptViewProps {
  instructions: OptInstruction[];
  passes?: OptPass[];
  stepIndex: number;
  steps: Step[];
}

export const OptView: React.FC<OptViewProps> = ({
  instructions,
  passes = [],
  stepIndex,
  steps,
}) => {
  const currentStep = steps[stepIndex];
  const activeOp = currentStep?.ops?.[0];

  const getPassLabel = (name: string): string => {
    switch (name) {
      case 'constant_folding':
        return 'Plegado de Constantes';
      case 'constant_propagation':
        return 'Propagación de Constantes';
      case 'copy_propagation':
        return 'Propagación de Copias';
      case 'dead_code_elimination':
        return 'Eliminación de Código Muerto';
      default:
        return name;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Instrucciones Optimizadas ({instructions.length}):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {steps.length}
        </span>
      </div>

      {/* Lista de instrucciones resultantes */}
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
            No hay instrucciones optimizadas.
          </p>
        ) : (
          instructions.map((ins, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem', width: '28px' }}>
                  [{ins.index}]
                </span>
                <strong style={{ color: '#FFFFFF', fontSize: '1rem' }}>
                  {ins.text}
                </strong>
              </div>
              <Chip label="Código Final Optimizado" variant="green" />
            </div>
          ))
        )}
      </div>

      {/* Detalle de la transformación del paso actual */}
      {activeOp && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid var(--blue-bright)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <strong style={{ color: 'var(--blue-bright)', fontSize: '0.85rem' }}>
            Transformación activa:
          </strong>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#FFFFFF' }}>
            {activeOp.op === 'fold' && `Plegado: ${activeOp.expr} → ${activeOp.result}`}
            {activeOp.op === 'propagate' && `Propagado: ${activeOp.var} = ${activeOp.val}`}
            {activeOp.op === 'remove' && `Eliminado código muerto (${activeOp.var || activeOp.count})`}
          </span>
        </div>
      )}

      {/* Resumen de pasadas realizadas */}
      {passes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h5 style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Resumen de pasadas aplicadas:
          </h5>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {passes.map((p, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--panel-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--text-pure)' }}>{getPassLabel(p.name)}</span>
                <Chip label={`${p.changes} cambios`} variant="blue" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
