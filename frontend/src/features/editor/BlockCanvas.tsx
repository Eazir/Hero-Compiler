import React from 'react';
import { Expr, FragmentType, Program, Stmt, bin, num, v } from '../../domain/blocks';
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
}

export const BlockCanvas: React.FC<BlockCanvasProps> = ({
  program,
  activeSlot,
  onSelectSlot,
  onRemoveStmt,
  onDropFragment,
  onUpdateNode,
  onUpdateVarName,
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
            title="Constante numérica editable (haz clic para escribir un número o arrastra otro fragmento)"
          >
            <input
              type="number"
              value={expr.value}
              aria-label="Editar valor numérico"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateNode(path, num(isNaN(val) ? 0 : val));
              }}
              style={{
                width: `${Math.max(2, String(expr.value).length + 1)}ch`,
                background: 'transparent',
                border: 'none',
                color: 'var(--violet)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                outline: 'none',
                padding: 0,
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
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
            title="Variable editable (haz clic para cambiar el nombre o arrastra otro fragmento)"
          >
            <input
              type="text"
              value={expr.name}
              maxLength={8}
              aria-label="Editar identificador de variable"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                onUpdateNode(path, v(val || 'x'));
              }}
              style={{
                width: `${Math.max(2, expr.name.length + 1)}ch`,
                background: 'transparent',
                border: 'none',
                color: 'var(--cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                outline: 'none',
                padding: 0,
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
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, path)}
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
                backgroundColor: 'rgba(255, 184, 77, 0.2)',
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

          {stmt.kind === 'assign' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={stmt.name}
                maxLength={8}
                aria-label="Editar identificador asignado"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  onUpdateVarName(idx, val || 'x');
                }}
                style={{
                  width: `${Math.max(2, stmt.name.length + 1)}ch`,
                  backgroundColor: 'rgba(94, 212, 232, 0.15)',
                  border: '1px solid var(--cyan)',
                  borderRadius: '4px',
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  outline: 'none',
                  padding: '2px 4px',
                }}
                title="Variable de asignación (editable)"
              />
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
        {program.length > 0 && program.length < 8 && (
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
