import React from 'react';
import { Step } from '../../../api/schema';

interface AstNodeData {
  id: string;
  kind: string;
  name?: string;
  value?: number;
  op?: string;
  children?: AstNodeData[];
  left?: AstNodeData;
  right?: AstNodeData;
  operand?: AstNodeData;
  expr?: AstNodeData;
  statements?: AstNodeData[];
}

interface AstViewProps {
  ast: AstNodeData | null;
  stepIndex: number;
  steps: Step[];
}

export const AstView: React.FC<AstViewProps> = ({ ast, stepIndex, steps }) => {
  const currentStep = steps[stepIndex];
  const focusedNodeIds = new Set(currentStep?.focus?.nodeIds || []);

  const renderNode = (node: AstNodeData | undefined, depth = 0): React.ReactNode => {
    if (!node) return null;
    const isFocused = focusedNodeIds.has(node.id);

    const getNodeLabel = (): string => {
      switch (node.kind) {
        case 'program':
          return 'Programa (MiniArit)';
        case 'assign':
          return `Asignación (${node.name} =)`;
        case 'print':
          return 'Print';
        case 'binop':
          return `Operador '${node.op}'`;
        case 'num':
          return `Número: ${node.value}`;
        case 'var':
          return `Variable: ${node.name}`;
        case 'neg':
          return 'Menos unario (-)';
        default:
          return node.kind;
      }
    };

    const getChildren = (): AstNodeData[] => {
      if (node.children) return node.children;
      if (node.statements) return node.statements;
      const ch: AstNodeData[] = [];
      if (node.expr) ch.push(node.expr);
      if (node.left) ch.push(node.left);
      if (node.right) ch.push(node.right);
      if (node.operand) ch.push(node.operand);
      return ch;
    };

    const children = getChildren();

    return (
      <div
        key={node.id}
        style={{
          marginLeft: depth > 0 ? '20px' : '0',
          marginTop: '6px',
          borderLeft: depth > 0 ? '2px dashed var(--line)' : 'none',
          paddingLeft: depth > 0 ? '12px' : '0',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isFocused
              ? 'rgba(37, 99, 235, 0.35)'
              : 'var(--panel-2)',
            border: isFocused
              ? '2px solid var(--blue-bright)'
              : '1px solid var(--line)',
            boxShadow: isFocused ? '0 0 14px rgba(56, 189, 248, 0.4)' : 'none',
            color: isFocused ? '#FFFFFF' : 'var(--text)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            transform: isFocused ? 'scale(1.03)' : 'scale(1)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: isFocused ? 'var(--blue-bright)' : 'var(--muted)',
              fontWeight: 700,
            }}
          >
            #{node.id}
          </span>
          <strong>{getNodeLabel()}</strong>
        </div>

        {children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!ast) {
    return (
      <div style={{ color: 'var(--muted)', fontStyle: 'italic', padding: '16px' }}>
        No hay árbol sintáctico disponible.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Estructura del Árbol Sintáctico (AST):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Paso {stepIndex + 1} de {steps.length}
        </span>
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
          minHeight: '140px',
        }}
      >
        {renderNode(ast)}
      </div>
    </div>
  );
};
