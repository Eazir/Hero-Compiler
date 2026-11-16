import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FragmentType } from '../../domain/blocks';
import { toSource } from '../../domain/serialize';
import { BlockPath } from '../../domain/sourceMap';
import { es } from '../../i18n/es';
import { useCompileStore } from '../../state/compileStore';
import { HERO_MISSIONS, useProgramStore } from '../../state/programStore';
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
    updateNode,
    updateVariableName,
    removeStatement,
    moveStatement,
    duplicateStatement,
    toggleStatementKind,
    swapBinaryOperands,
    unwrapExpr,
    loadMission,
    undo,
    canUndo,
    loadDefaultExample,
    reset,
  } = useProgramStore();

  const { status, errorMessage, compileSource } = useCompileStore();
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const { text } = toSource(program);

  const handleSelectFragment = (type: FragmentType, slot?: BlockPath) => {
    const res = insertFragment(type, slot);
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
    handleSelectFragment(type, slot);
  };

  const handleDuplicate = (index: number) => {
    const res = duplicateStatement(index);
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

  const handleCompile = async (overrideSource?: string) => {
    const srcToCompile = typeof overrideSource === 'string' ? overrideSource : text;
    const res = await compileSource(srcToCompile, true);
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
          Diseña tu programa con bloques interactivos, transforma expresiones o edita código libremente antes de entrar a los mini-juegos de compilación.
        </p>
      </header>

      {/* Selector de Misiones Predefinidas de Hero-Compiler */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
          gap: '10px',
        }}
      >
        {HERO_MISSIONS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setWarningMessage(null);
              loadMission(m.id);
            }}
            style={{
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(15, 29, 54, 0.75)',
              border: '1px solid var(--line)',
              color: 'var(--text-pure)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <strong style={{ fontSize: '0.85rem', color: 'var(--green)' }}>
              🎯 {m.title}
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {m.desc}
            </span>
          </button>
        ))}
      </div>

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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '20px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          <Palette onSelectFragment={handleSelectFragment} disabled={fragmentCount >= 12} />
          <BlockCanvas
            program={program}
            activeSlot={activeSlot}
            onSelectSlot={setActiveSlot}
            onRemoveStmt={removeStatement}
            onDropFragment={handleDropFragment}
            onUpdateNode={updateNode}
            onUpdateVarName={updateVariableName}
            onMoveStmt={moveStatement}
            onDuplicateStmt={handleDuplicate}
            onToggleStmtKind={toggleStatementKind}
            onSwapOperands={swapBinaryOperands}
            onUnwrapExpr={unwrapExpr}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
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
