import React from 'react';
import { Expr, FragmentType, Program, Stmt } from '../../domain/blocks';
import { BlockPath } from '../../domain/sourceMap';
import { Panel } from '../../ui/Panel';

interface BlockCanvasProps {
  program: Program;
  activeSlot: BlockPath | null;
  onSelectSlot: (slot: BlockPath | null) => void;
  onRemoveStmt: (index: number) => void;
  onDropFragment: (type: FragmentType, slot?: BlockPath) => void;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  program,
  activeSlot,
  onSelectSlot,
  onRemoveStmt,
  onDropFragment,
}) => {
  const isSlotActive = (path: BlockPath) => {
    if (!activeSlot) return false;
    return JSON.stringify(activeSlot) === JSON.stringify(path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, slot?: BlockPath) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('text/plain') as FragmentType;
    if (type) {
      onDropFragment(type, slot);
    }
  };

  const renderExpr = (expr: Expr, path: BlockPath): React.ReactNode => {
    const active = isSlotActive(path);

    const slotStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: active ? 'rgba(255, 184, 77, 0.2)' : 'var(--panel-2)',
      border: active ? '2px solid var(--amber)' : '1px dashed var(--line)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };

    switch (expr.kind) {
      case 'num':
        return (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(path);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelectSlot(path);
              }
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, path)}
            style={{
              ...slotStyle,
              color: 'var(--violet)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            title="Constante numérica (haz clic o Enter para seleccionar ranura)"
          >
            {expr.value}
          </span>
        );

      case 'var':
        return (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(path);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onSelectSlot(path);
              }
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, path)}
            style={{
              ...slotStyle,
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            title="Variable (haz clic o Enter para seleccionar ranura)"
          >
            {expr.name}
          </span>
        );

      case 'neg':
        return (
          <span
            role="group"
            style={{
              ...slotStyle,
              border: active ? '2px solid var(--amber)' : '1px solid var(--line)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(path);
            }}
          >
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>-</span>
            {renderExpr(expr.operand, [...path, 'operand'])}
          </span>
        );

      case 'bin':
        return (
          <span
            role="group"
            style={{
              ...slotStyle,
              border: active ? '2px solid var(--amber)' : '1px solid var(--line)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(path);
            }}
          >
            {renderExpr(expr.left, [...path, 'left'])}
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 184, 77, 0.15)',
                color: 'var(--amber)',
                fontWeight: 700,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {expr.op}
            </span>
            {renderExpr(expr.right, [...path, 'right'])}
          </span>
        );
    }
  };

  const renderStmt = (stmt: Stmt, idx: number): React.ReactNode => {
    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          gap: '12px',
          minHeight: '44px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              width: '24px',
            }}
          >
            {idx + 1}.
          </span>

          {stmt.kind === 'assign' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  color: 'var(--cyan)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(94, 212, 232, 0.1)',
                  borderRadius: '4px',
                }}
              >
                {stmt.name}
              </span>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>=</span>
              {renderExpr(stmt.expr, [idx, 'expr'])}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                print(
              </span>
              {renderExpr(stmt.expr, [idx, 'expr'])}
              <span
                style={{
                  color: 'var(--green)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                )
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemoveStmt(idx)}
          aria-label={`Eliminar línea ${idx + 1}`}
          title="Eliminar esta línea"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <Panel title="Lienzo de Bloques">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {program.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
            style={{
              padding: '30px',
              border: '2px dashed var(--line)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.9rem',
            }}
          >
            El programa está vacío. Arrastra una <strong>asignación</strong> o <strong>print</strong> aquí, o selecciónala en la paleta.
          </div>
        ) : (
          program.map((stmt, idx) => renderStmt(stmt, idx))
        )}

        {/* Zona para soltar nueva sentencia */}
        {program.length < 8 && (
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
            style={{
              marginTop: '4px',
              padding: '10px',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.8rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            + Arrastra un fragmento aquí para agregar otra sentencia
          </div>
        )}
      </div>
    </Panel>
  );
};
