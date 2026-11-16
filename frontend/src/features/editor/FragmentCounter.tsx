import React from 'react';
import { MAX_FRAGMENTS, MAX_LINES } from '../../domain/blocks';
import { Chip } from '../../ui/Chip';

interface FragmentCounterProps {
  fragments: number;
  lines: number;
}

export const FragmentCounter: React.FC<FragmentCounterProps> = ({ fragments, lines }) => {
  const isFragmentLimit = fragments >= MAX_FRAGMENTS;
  const isLineLimit = lines >= MAX_LINES;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Chip
          label={`${fragments} / ${MAX_FRAGMENTS} Fragmentos`}
          variant={isFragmentLimit ? 'red' : fragments > 8 ? 'amber' : 'violet'}
        />
        <Chip
          label={`${lines} / ${MAX_LINES} Líneas`}
          variant={isLineLimit ? 'red' : 'default'}
        />
      </div>

      {(isFragmentLimit || isLineLimit) && (
        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--red)',
            fontWeight: 600,
          }}
        >
          {isFragmentLimit
            ? `Límite de fragmentos alcanzado (${MAX_FRAGMENTS} máx).`
            : `Límite de líneas alcanzado (${MAX_LINES} máx).`}
        </span>
      )}
    </div>
  );
};

