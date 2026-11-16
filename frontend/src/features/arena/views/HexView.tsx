import React, { useState } from 'react';
import { Step } from '../../../api/schema';
import { Chip } from '../../../ui/Chip';

export interface BinaryRow {
  offset: number;
  bytes: string;
  asm: string;
  ir?: string | null;
}

interface HexViewProps {
  hex: string;
  size: number;
  rows: BinaryRow[];
  stepIndex: number;
  steps: Step[];
}

export const HexView: React.FC<HexViewProps> = ({ size, rows, stepIndex }) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rejilla Hexadecimal de 8 Bytes ({size} bytes totales):
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Formato Little-Endian: [opcode, dst, src, 0x00, imm32]
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '16px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
        }}
      >
        {rows.map((row, idx) => {
          const isStepActive = idx === stepIndex;
          const isHovered = hoveredRow === idx;
          const byteList = row.bytes.split(' ');

          return (
            <div
              key={row.offset}
              onMouseEnter={() => setHoveredRow(idx)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr minmax(140px, auto)',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                backgroundColor:
                  isStepActive || isHovered
                    ? 'rgba(37, 99, 235, 0.22)'
                    : 'rgba(15, 23, 42, 0.65)',
                border:
                  isStepActive || isHovered
                    ? '1px solid var(--blue-bright)'
                    : '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                +0x{row.offset.toString(16).padStart(2, '0').toUpperCase()}
              </span>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {byteList.map((b, bIdx) => (
                  <span
                    key={bIdx}
                    title={
                      bIdx === 0
                        ? 'Byte 0: Opcode'
                        : bIdx === 1
                        ? 'Byte 1: Registro Destino (dst)'
                        : bIdx === 2
                        ? 'Byte 2: Registro Fuente (src)'
                        : bIdx === 3
                        ? 'Byte 3: Reservado (0x00)'
                        : `Byte ${bIdx}: Inmediato 32-bit (little-endian)`
                    }
                    style={{
                      padding: '3px 7px',
                      borderRadius: '4px',
                      backgroundColor:
                        bIdx === 0
                          ? 'rgba(16, 185, 129, 0.22)'
                          : bIdx >= 4
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(255, 255, 255, 0.06)',
                      color:
                        bIdx === 0
                          ? 'var(--green)'
                          : bIdx >= 4
                          ? 'var(--blue-bright)'
                          : 'var(--text-pure)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {b.toUpperCase()}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                <Chip label={row.asm} variant={isStepActive || isHovered ? 'green' : 'default'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
