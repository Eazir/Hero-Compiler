import React from 'react';
import { Expr, FragmentType, MAX_LINES, Program, Stmt, bin, getNodeAtPath, num, v } from '../../domain/blocks';
import { BlockPath } from '../../domain/sourceMap';
import { Panel } from '../../ui/Panel';

interface BlockCanvasProps {
  program: Program;
  activeSlot: BlockPath | null;
  onSelectSlot: (slot: BlockPath | null) => void;
  onRemoveStmt: (index: number) => void;
  onDropFragment: (type: FragmentType, slot?: BlockPath) => void;
  onUpdateNode: (path: BlockPath, replacement: Expr | Stmt) => void;
  onUpdateVarName: (index: number, name: string) => void;
  onMoveStmt?: (index: number, direction: 'up' | 'down') => void;
  onDuplicateStmt?: (index: number) => void;
  onToggleStmtKind?: (index: number) => void;
  onSwapOperands?: (path: BlockPath) => void;
  onUnwrapExpr?: (path: BlockPath) => void;
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  program,
  activeSlot,
  onSelectSlot,
  onRemoveStmt,
  onDropFragment,
  onUpdateNode,
  onUpdateVarName,
  onMoveStmt,
  onDuplicateStmt,
  onToggleStmtKind,
  onSwapOperands,
  onUnwrapExpr,
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

  const activeNode = activeSlot ? getNodeAtPath(program, activeSlot) : null;

  const renderExpr = (expr: Expr, path: BlockPath): React.ReactNode => {
    const active = isSlotActive(path);

    const slotStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: active ? 'rgba(16, 185, 129, 0.22)' : 'var(--panel-2)',
      border: active ? '2px solid var(--green)' : '1px dashed var(--line)',
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
              padding: '2px 4px',
              color: 'var(--violet)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            title="Constante numérica editable (haz clic para escribir un número o arrastra otro fragmento)"
          >
            <input
              type="text"
              inputMode="numeric"
              value={expr.value}
              aria-label="Editar valor numérico"
              onClick={(e) => {
                e.stopPropagation();
                onSelectSlot(path);
              }}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9-]/g, '');
                const val = parseInt(cleaned, 10);
                onUpdateNode(path, num(isNaN(val) ? 0 : val));
              }}
              style={{
                minWidth: '64px',
                width: `${Math.max(5, String(expr.value).length + 3)}ch`,
                backgroundColor: 'rgba(129, 140, 248, 0.16)',
                border: '1px solid rgba(129, 140, 248, 0.5)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                outline: 'none',
                padding: '4px 10px',
              }}
            />
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
              padding: '2px 4px',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            title="Variable editable (haz clic para cambiar el nombre o arrastra otro fragmento)"
          >
            <input
              type="text"
              value={expr.name}
              maxLength={12}
              aria-label="Editar identificador de variable"
              onClick={(e) => {
                e.stopPropagation();
                onSelectSlot(path);
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                onUpdateNode(path, v(val || 'x'));
              }}
              style={{
                minWidth: '58px',
                width: `${Math.max(4, expr.name.length + 3)}ch`,
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '6px',
                color: 'var(--cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                outline: 'none',
                padding: '4px 8px',
              }}
            />
          </span>
        );

      case 'neg':
        return (
          <span
            role="group"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, path)}
            style={{
              ...slotStyle,
              border: active ? '2px solid var(--green)' : '1px solid var(--line)',
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
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, path)}
            style={{
              ...slotStyle,
              border: active ? '2px solid var(--green)' : '1px solid var(--line)',
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const nextOp = expr.op === '+' ? '-' : expr.op === '-' ? '*' : '+';
                onUpdateNode(path, bin(nextOp, expr.left, expr.right));
              }}
              title="Cambiar operador (+, -, *)"
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid var(--amber)',
                color: 'var(--amber)',
                fontWeight: 700,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {expr.op}
            </button>
            {renderExpr(expr.right, [...path, 'right'])}
          </span>
        );
    }
  };

  const renderStmt = (stmt: Stmt, idx: number): React.ReactNode => {
    return (
      <div
        key={idx}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, [idx, 'expr'])}
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
          transition: 'border-color 0.15s ease',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              width: '24px',
              userSelect: 'none',
            }}
          >
            {idx + 1}.
          </span>

          {/* Botón para alternar entre Asignación y Print en cualquier línea */}
          {onToggleStmtKind && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStmtKind(idx);
              }}
              title="Haz clic para alternar esta sentencia entre Asignación (x = ...) y Salida (print(...))"
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor:
                  stmt.kind === 'assign' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                color: stmt.kind === 'assign' ? 'var(--blue-bright)' : 'var(--green)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              {stmt.kind === 'assign' ? 'SET' : 'OUT'}
            </button>
          )}

          {stmt.kind === 'assign' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={stmt.name}
                maxLength={12}
                aria-label="Editar identificador asignado"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  onUpdateVarName(idx, val || 'x');
                }}
                style={{
                  minWidth: '58px',
                  width: `${Math.max(4, stmt.name.length + 3)}ch`,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid var(--cyan)',
                  borderRadius: '6px',
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  outline: 'none',
                  padding: '4px 8px',
                }}
                title="Variable de asignación (editable)"
              />
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>=</span>
              {renderExpr(stmt.expr, [idx, 'expr'])}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

        {/* Acciones de línea: Subir, Bajar, Duplicar y Eliminar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onMoveStmt && (
            <>
              <button
                type="button"
                disabled={idx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveStmt(idx, 'up');
                }}
                title="Mover sentencia hacia arriba"
                style={{
                  background: 'none',
                  border: '1px solid var(--line)',
                  color: idx === 0 ? 'var(--line)' : 'var(--muted)',
                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={idx === program.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveStmt(idx, 'down');
                }}
                title="Mover sentencia hacia abajo"
                style={{
                  background: 'none',
                  border: '1px solid var(--line)',
                  color: idx === program.length - 1 ? 'var(--line)' : 'var(--muted)',
                  cursor: idx === program.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
              >
                ↓
              </button>
            </>
          )}
          {onDuplicateStmt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateStmt(idx);
              }}
              title="Duplicar esta sentencia"
              style={{
                background: 'none',
                border: '1px solid var(--line)',
                color: 'var(--blue-bright)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '4px 6px',
                borderRadius: '4px',
              }}
            >
              ⧉
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveStmt(idx);
            }}
            aria-label={`Eliminar línea ${idx + 1}`}
            title="Eliminar esta línea"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px 8px',
              borderRadius: '4px',
              minHeight: '36px',
              minWidth: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  return (
    <Panel title="Lienzo de Bloques">
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minHeight: '180px',
        }}
      >
        {/* Inspector de transformaciones rápidas cuando un nodo/expresión está seleccionado */}
        {activeSlot && activeNode && 'kind' in activeNode && activeNode.kind !== 'assign' && activeNode.kind !== 'print' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--green)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>
              ⚡ Transformar bloque seleccionado:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onDropFragment('+', activeSlot)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                + Sumar
              </button>
              <button
                type="button"
                onClick={() => onDropFragment('-', activeSlot)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                - Restar
              </button>
              <button
                type="button"
                onClick={() => onDropFragment('*', activeSlot)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                * Multiplicar
              </button>
              <button
                type="button"
                onClick={() => onDropFragment('neg', activeSlot)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--panel-2)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--amber)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                -x Negar
              </button>
              {activeNode.kind === 'bin' && onSwapOperands && (
                <button
                  type="button"
                  onClick={() => onSwapOperands(activeSlot)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--panel-2)',
                    border: '1px solid var(--blue-bright)',
                    color: 'var(--blue-bright)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  ⇄ Invertir izq/der
                </button>
              )}
              {(activeNode.kind === 'bin' || activeNode.kind === 'neg') && onUnwrapExpr && (
                <button
                  type="button"
                  onClick={() => onUnwrapExpr(activeSlot)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--panel-2)',
                    border: '1px solid var(--red)',
                    color: 'var(--red)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  ⌫ Simplificar
                </button>
              )}
            </div>
          </div>
        )}

        {program.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              border: '2px dashed var(--line)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.95rem',
            }}
          >
            <p style={{ marginBottom: '14px' }}>
              El programa está vacío. Arrastra una <strong>asignación</strong> o <strong>print</strong> aquí, o haz clic en los botones de abajo:
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onDropFragment('assign')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(94, 212, 232, 0.15)',
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                + Asignación (x = 1)
              </button>
              <button
                type="button"
                onClick={() => onDropFragment('print')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(94, 224, 160, 0.15)',
                  border: '1px solid var(--green)',
                  color: 'var(--green)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                + Print (print(x))
              </button>
            </div>
          </div>
        ) : (
          program.map((stmt, idx) => renderStmt(stmt, idx))
        )}

        {/* Zona para agregar sentencias adicionales */}
        {program.length > 0 && program.length < MAX_LINES && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Arrastra un fragmento aquí o añade rápidamente:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onDropFragment('assign')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(94, 212, 232, 0.15)',
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Asignación
              </button>
              <button
                type="button"
                onClick={() => onDropFragment('print')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(94, 224, 160, 0.15)',
                  border: '1px solid var(--green)',
                  color: 'var(--green)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Print
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};
