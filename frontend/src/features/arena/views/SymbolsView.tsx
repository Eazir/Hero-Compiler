import React from 'react';
import { Step } from '../../../api/schema';
import { Chip } from '../../../ui/Chip';

export interface SymbolRow {
  name: string;
  type: string;
  line: number;
  uses: number;
  literal?: number;
}

export interface WarningRow {
  code: string;
  message: string;
  line: number;
  col: number;
}

interface SymbolsViewProps {
  symbols: SymbolRow[];
  warnings?: WarningRow[];
  stepIndex: number;
  steps: Step[];
}

export const SymbolsView: React.FC<SymbolsViewProps> = ({
  symbols,
  warnings = [],
  stepIndex,
  steps,
}) => {
  const currentStep = steps[stepIndex];
  // Identificar si alguna variable fue declarada o buscada en este paso
  const activeVarName = currentStep?.ops?.find(
    (op) => op.op === 'declare' || op.op === 'lookup'
  )?.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tabla de Símbolos ({symbols.length} variables registradas):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {steps.length}
        </span>
      </div>

      <div
        style={{
          overflowX: 'auto',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
              <th style={{ padding: '10px 14px' }}>Identificador</th>
              <th style={{ padding: '10px 14px' }}>Tipo</th>
              <th style={{ padding: '10px 14px' }}>Línea</th>
              <th style={{ padding: '10px 14px' }}>Usos</th>
              <th style={{ padding: '10px 14px' }}>Valor Literal</th>
              <th style={{ padding: '10px 14px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {symbols.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '16px', color: 'var(--muted)', textAlign: 'center' }}>
                  No hay variables registradas en este punto del análisis.
                </td>
              </tr>
            ) : (
              symbols.map((sym, idx) => {
                const isActive = activeVarName === sym.name;
                const isUnused = sym.uses === 0;

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      backgroundColor: isActive
                        ? 'rgba(37, 99, 235, 0.2)'
                        : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#FFFFFF', fontWeight: 700 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--blue-bright)',
                        }}
                      >
                        {isActive && <span>●</span>}
                        {sym.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted-light)' }}>{sym.type}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Línea {sym.line}</td>
                    <td style={{ padding: '10px 14px', color: isUnused ? 'var(--red)' : 'var(--green-bright)' }}>
                      {sym.uses} {sym.uses === 1 ? 'uso' : 'usos'}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                      {sym.literal !== undefined ? sym.literal : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Chip
                        label={isUnused ? 'Sin leer' : 'Activa'}
                        variant={isUnused ? 'red' : 'green'}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Advertencias semánticas (W-301) si existen */}
      {warnings.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid var(--blue-bright)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <strong style={{ color: 'var(--blue-bright)', fontSize: '0.85rem' }}>
            Advertencia detectada ({warnings[0].code}):
          </strong>
          {warnings.map((w, idx) => (
            <p key={idx} style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
              {w.message} (Línea {w.line})
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
