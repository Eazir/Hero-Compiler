import React from 'react';
import { Step } from '../../../api/schema';

export interface TokenItem {
  type: string;
  lexeme: string;
  line: number;
  col: number;
}

interface TokensViewProps {
  tokens: TokenItem[];
  stepIndex: number;
  steps: Step[];
}

export const TokensView: React.FC<TokensViewProps> = ({ tokens, stepIndex, steps }) => {
  const currentStep = steps[stepIndex];
  const activeSpan = currentStep?.focus?.span;

  const isTokenActive = (tok: TokenItem) => {
    if (!activeSpan) return false;
    return tok.line === activeSpan.line && tok.col === activeSpan.col;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Flujo de Tokens Reconocidos ({tokens.length}):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {steps.length}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '16px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          minHeight: '120px',
        }}
      >
        {tokens.map((tok, idx) => {
          const active = isTokenActive(tok);
          // Mostrar solo tokens que ya han sido procesados hasta este paso (o todos resaltando el activo)
          const visible = idx <= stepIndex || stepIndex >= tokens.length - 1;

          return (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: active
                  ? 'rgba(37, 99, 235, 0.3)'
                  : visible
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(15, 23, 42, 0.3)',
                border: active
                  ? '2px solid var(--blue-bright)'
                  : '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: active ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
                opacity: visible ? 1 : 0.4,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: active ? 'scale(1.05)' : 'scale(1)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--muted-light)',
                  textTransform: 'uppercase',
                }}
              >
                {tok.type}
              </span>
              <strong
                style={{
                  color: active ? '#FFFFFF' : 'var(--green-bright)',
                  fontSize: '0.9rem',
                }}
              >
                {tok.lexeme === '\n' ? '\\n' : tok.lexeme || 'EOF'}
              </strong>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--muted)',
                }}
              >
                L{tok.line}:C{tok.col}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
