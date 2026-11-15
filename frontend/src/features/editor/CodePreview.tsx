import React from 'react';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Panel } from '../../ui/Panel';

interface CodePreviewProps {
  sourceText: string;
  isCompiling: boolean;
  onCompile: () => void;
  onQuickLoad?: (code: string) => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  sourceText,
  isCompiling,
  onCompile,
  onQuickLoad,
}) => {
  const lines = sourceText ? sourceText.split('\n') : [];

  return (
    <Panel
      title="Vista Previa de Código (MiniArit)"
      badge={
        <Chip
          label={isCompiling ? 'Compilando...' : 'Listo'}
          variant={isCompiling ? 'amber' : 'green'}
        />
      }
    >
      <div
        className="font-mono"
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          minHeight: '160px',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          overflowX: 'auto',
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
            // Programa vacío. Agrega bloques o carga un ejemplo.
          </span>
        ) : (
          lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '16px' }}>
              <span
                style={{
                  color: 'var(--muted)',
                  userSelect: 'none',
                  width: '20px',
                  textAlign: 'right',
                  opacity: 0.6,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ color: 'var(--text)' }}>{line}</span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginTop: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <Button
          variant="primary"
          onClick={onCompile}
          disabled={isCompiling || !sourceText.trim()}
          style={{ flexGrow: 1, minWidth: '130px' }}
        >
          {isCompiling ? 'Compilando...' : 'Compilar Programa'}
        </Button>

        {onQuickLoad && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onQuickLoad('a = @')}
              title="Error léxico E-101: carácter inválido @"
            >
              Probar E-101
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onQuickLoad('c = + 2')}
              title="Error sintáctico E-201: falta operando"
            >
              Probar E-201
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onQuickLoad('a = d + 1')}
              title="Error semántico E-301: variable d no declarada"
            >
              Probar E-301
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};

