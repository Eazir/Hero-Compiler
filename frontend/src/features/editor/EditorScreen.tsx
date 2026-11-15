import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgramStore } from '../../state/programStore';
import { useCompileStore } from '../../state/compileStore';
import { toSource } from '../../domain/serialize';
import { Panel } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Block } from '../../ui/Block';
import { Chip } from '../../ui/Chip';
import { es } from '../../i18n/es';

export const EditorScreen: React.FC = () => {
  const navigate = useNavigate();
  const { program, fragmentCount, loadDefaultExample, reset } = useProgramStore();
  const { status, errorMessage, compileSource } = useCompileStore();

  const { text } = toSource(program);

  const handleCompile = async () => {
    const res = await compileSource(text, true);
    if (res) {
      if (res.ok) {
        navigate('/arena');
      } else {
        navigate('/error');
      }
    }
  };

  const handleQuickLoad = async (src: string) => {
    const res = await compileSource(src, true);
    if (res) {
      if (res.ok) {
        navigate('/arena');
      } else {
        navigate('/error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          {es.app.nav.editor}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Construye expresiones y sentencias con bloques o prueba ejemplos de referencia.
        </p>
      </header>

      {/* Barra de estado y fragmentos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Chip
            label={`${fragmentCount} / 12 Fragmentos`}
            variant={fragmentCount >= 12 ? 'red' : 'violet'}
          />
          <Chip label="Máx 8 líneas" variant="default" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={loadDefaultExample}>
            {es.app.actions.loadExample}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            {es.app.actions.reset}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Paleta de Fragmentos */}
        <Panel title="Paleta de Fragmentos (MiniArit)">
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Haz clic o pulsa Enter sobre cualquier fragmento para agregarlo al programa:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
            <Block type="variable" label="x (Variable)" />
            <Block type="number" label="42 (Número)" />
            <Block type="operation" label="+ (Suma)" />
            <Block type="operation" label="- (Resta)" />
            <Block type="operation" label="* (Multiplicación)" />
            <Block type="assign" label="a = expr" />
            <Block type="print" label="print(expr)" />
          </div>
        </Panel>

        {/* Vista previa del código fuente generado */}
        <Panel
          title="Vista Previa de Código (MiniArit)"
          badge={<Chip label={status === 'loading' ? 'Compilando...' : 'Listo'} variant="amber" />}
        >
          <pre
            className="font-mono"
            style={{
              padding: '16px',
              backgroundColor: 'var(--panel-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              minHeight: '140px',
              fontSize: '0.95rem',
              lineHeight: '1.6',
            }}
          >
            {text || '// Programa vacío. Agrega bloques o carga un ejemplo.'}
          </pre>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={handleCompile} disabled={status === 'loading' || !text.trim()}>
              {status === 'loading' ? es.app.actions.compiling : es.app.actions.compile}
            </Button>
            <Button variant="secondary" onClick={() => handleQuickLoad('a = @')}>
              Probar E-101 (Léxico)
            </Button>
            <Button variant="secondary" onClick={() => handleQuickLoad('a = 3b')}>
              Probar E-102 (Léxico)
            </Button>
          </div>
        </Panel>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '14px',
            backgroundColor: 'rgba(255, 111, 125, 0.15)',
            border: '1px solid var(--red)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--red)',
            fontSize: '0.9rem',
          }}
        >
          <strong>Error de compilación:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
};
