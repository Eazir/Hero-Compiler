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
  { type: 'var', uiType: 'variable', label: 'x (Variable)', desc: 'Identificador de variable' },
  { type: 'num', uiType: 'number', label: '42 (Número)', desc: 'Constante entera de 32 bits' },
  { type: '+', uiType: 'operation', label: '+ (Suma)', desc: 'Suma aritmética binaria' },
  { type: '-', uiType: 'operation', label: '- (Resta)', desc: 'Resta aritmética binaria' },
  { type: '*', uiType: 'operation', label: '* (Multiplicación)', desc: 'Multiplicación (mayor precedencia)' },
  { type: 'neg', uiType: 'operation', label: '-x (Negación)', desc: 'Menos unario para invertir signo' },
  { type: 'assign', uiType: 'assign', label: 'x = expr', desc: 'Sentencia de asignación' },
  { type: 'print', uiType: 'print', label: 'print(expr)', desc: 'Sentencia de salida estándar' },
];

export const Palette: React.FC<PaletteProps> = ({ onSelectFragment, disabled }) => {
  return (
    <Panel title="Paleta de Fragmentos (7 tipos)">
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '12px' }}>
        Arrastra cualquier fragmento al lienzo o haz clic / pulsa <strong>Enter</strong> sobre él para construir o anidar expresiones.
      </p>

      <div
        role="group"
        aria-label="Fragmentos disponibles para el editor"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
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
