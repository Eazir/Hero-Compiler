import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FragmentType } from '../../domain/blocks';
import { toSource } from '../../domain/serialize';
import { BlockPath } from '../../domain/sourceMap';
import { es } from '../../i18n/es';
import { useCompileStore } from '../../state/compileStore';
import { useProgramStore } from '../../state/programStore';
import { Button } from '../../ui/Button';
import { BlockCanvas } from './BlockCanvas';
import { CodePreview } from './CodePreview';
import { FragmentCounter } from './FragmentCounter';
import { Palette } from './Palette';

export const EditorScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    program,
    fragmentCount,
    lineCount,
    activeSlot,
    setActiveSlot,
    insertFragment,
    removeStatement,
    undo,
    canUndo,
    loadDefaultExample,
    reset,
  } = useProgramStore();

  const { status, errorMessage, compileSource } = useCompileStore();
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const { text } = toSource(program);

  const handleSelectFragment = (type: FragmentType) => {
    const res = insertFragment(type);
    if (!res.ok) {
      if (res.reason === 'MAX_FRAGMENTS') {
        setWarningMessage('El fragmento 13 fue rechazado: el límite máximo es de 12 fragmentos.');
      } else if (res.reason === 'MAX_LINES') {
        setWarningMessage('No se pueden agregar más de 8 líneas al programa.');
      }
    } else {
      setWarningMessage(null);
    }
  };

  const handleDropFragment = (type: FragmentType, slot?: BlockPath) => {
    if (slot) {
      setActiveSlot(slot);
    }
    handleSelectFragment(type);
  };

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
          Construye programas con fragmentos visuales arrastrando o usando el teclado.
        </p>
      </header>

      {/* Barra de control y conteo de fragmentos */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <FragmentCounter fragments={fragmentCount} lines={lineCount} />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            title="Deshacer último cambio"
          >
            {es.app.actions.undo}
          </Button>
          <Button variant="secondary" size="sm" onClick={loadDefaultExample}>
            {es.app.actions.loadExample}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            {es.app.actions.clear}
          </Button>
        </div>
      </div>

      {/* Alerta de rechazo de límite (criterio: fragmento 13 rechazado con motivo visible) */}
      {warningMessage && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 111, 125, 0.15)',
            border: '1px solid var(--red)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--red)',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{warningMessage}</span>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Disposición del editor: Paleta y Lienzo a la izquierda, Vista previa a la derecha */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Palette onSelectFragment={handleSelectFragment} disabled={fragmentCount >= 12} />
          <BlockCanvas
            program={program}
            activeSlot={activeSlot}
            onSelectSlot={setActiveSlot}
            onRemoveStmt={removeStatement}
            onDropFragment={handleDropFragment}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CodePreview
            sourceText={text}
            isCompiling={status === 'loading'}
            onCompile={handleCompile}
            onQuickLoad={handleQuickLoad}
          />
        </div>
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
