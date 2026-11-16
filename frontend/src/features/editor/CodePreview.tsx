import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Panel } from '../../ui/Panel';

interface CodePreviewProps {
  sourceText: string;
  isCompiling: boolean;
  onCompile: (overrideSource?: string) => void;
  onQuickLoad?: (code: string) => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  sourceText,
  isCompiling,
  onCompile,
  onQuickLoad,
}) => {
  const [freeEditMode, setFreeEditMode] = useState(false);
  const [customSource, setCustomSource] = useState(sourceText);

  useEffect(() => {
    if (!freeEditMode) {
      setCustomSource(sourceText);
    }
  }, [sourceText, freeEditMode]);

  const effectiveSource = freeEditMode ? customSource : sourceText;
  const lines = effectiveSource ? effectiveSource.split('\n') : [];

  return (
    <Panel
      title="Vista Previa de Código (MiniArit)"
      badge={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setFreeEditMode((v) => !v)}
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: freeEditMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.14)',
              border: freeEditMode ? '1px solid var(--green)' : '1px solid var(--blue-bright)',
              color: freeEditMode ? 'var(--green)' : 'var(--blue-bright)',
            }}
          >
            {freeEditMode ? '🔒 Sincronizar con Bloques' : '✏️ Modo Código Libre'}
          </button>
          <Chip
            label={isCompiling ? 'Compilando...' : 'Listo'}
            variant={isCompiling ? 'amber' : 'green'}
          />
        </div>
      }
    >
      {freeEditMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>
            Escribe o modifica directamente cualquier programa MiniArit (máx 8 líneas):
          </span>
          <textarea
            aria-label="Editor de código MiniArit libre"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'var(--panel-2)',
              border: '1px solid var(--green)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-pure)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      ) : (
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
              // Programa vacío. Agrega bloques o elige una misión arriba.
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
      )}

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
          onClick={() => onCompile(effectiveSource)}
          disabled={isCompiling || !effectiveSource.trim()}
          style={{ flexGrow: 1, minWidth: '150px' }}
        >
          {isCompiling ? 'Compilando...' : '🎮 Compilar y Jugar Fases (Hero-Compiler)'}
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
