import React from 'react';
import { FragmentType } from '../../domain/blocks';
import { Block } from '../../ui/Block';
import { Panel } from '../../ui/Panel';

interface PaletteProps {
  onSelectFragment: (type: FragmentType) => void;
  disabled?: boolean;
}

interface PaletteItem {
  type: FragmentType;
  uiType: 'variable' | 'number' | 'operation' | 'assign' | 'print';
  label: string;
  desc: string;
}

const ITEMS: PaletteItem[] = [
  { type: 'var', uiType: 'variable', label: 'x (Variable)', desc: 'Identificador' },
  { type: 'num', uiType: 'number', label: '42 (Número)', desc: 'Constante entera' },
  { type: '+', uiType: 'operation', label: '+ (Suma)', desc: 'Suma aritmética' },
  { type: '-', uiType: 'operation', label: '- (Resta)', desc: 'Resta aritmética' },
  { type: '*', uiType: 'operation', label: '* (Multiplicación)', desc: 'Multiplicación' },
  { type: 'assign', uiType: 'assign', label: 'x = expr', desc: 'Sentencia de asignación' },
  { type: 'print', uiType: 'print', label: 'print(expr)', desc: 'Sentencia de salida' },
];

export const Palette: React.FC<PaletteProps> = ({ onSelectFragment, disabled }) => {
  return (
    <Panel title="Paleta de Fragmentos (7 tipos)">
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '12px' }}>
        Arrastra un fragmento al lienzo o selecciónalo con el teclado y pulsa <strong>Enter</strong> para insertarlo.
      </p>

      <div
        role="group"
        aria-label="Fragmentos disponibles para el editor"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '10px',
        }}
      >
        {ITEMS.map((item) => (
          <div
            key={item.type}
            draggable={!disabled}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', item.type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={item.desc}
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <Block
              type={item.uiType}
              label={item.label}
              onClick={() => onSelectFragment(item.type)}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
};
