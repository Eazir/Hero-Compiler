import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompileStore } from '../../state/compileStore';
import { Panel } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { es } from '../../i18n/es';

export const ResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const { trace } = useCompileStore();
  const [consoleOpen] = useState(true);

  if (!trace || !trace.ok) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--muted)' }}>No hay un programa compilado con éxito disponible.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Ir al Editor
        </Button>
      </div>
    );
  }

  const hexBytes = trace.executable?.hex || '';
  const sizeBytes = trace.executable?.size || 0;
  const stdout = trace.run?.stdout || [];
  const exitCode = trace.run?.exitCode ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {es.app.nav.result}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Ejecución del binario en la Máquina Virtual CompiLab ISA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/arena')}>
            ← Ver Arena
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/')}>
            Nuevo Programa
          </Button>
        </div>
      </header>

      {/* Tarjetas de Métricas de Compilación */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Panel title="Tamaño del Binario">
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--amber)' }}>
            {sizeBytes} <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 400 }}>bytes</span>
          </div>
        </Panel>

        <Panel title="Estado de Ejecución">
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: exitCode === 0 ? 'var(--green)' : 'var(--red)' }}>
            {exitCode === 0 ? 'Exitoso' : 'Error'} <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 400 }}>(Exit {exitCode})</span>
          </div>
        </Panel>

        <Panel title="Tiempo de Compilación">
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--cyan)' }}>
            {trace.meta?.elapsedMs?.toFixed(1) || '0.0'} <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 400 }}>ms</span>
          </div>
        </Panel>
      </div>

      {/* Escritorio y Consola */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Binario Hex */}
        <Panel
          title="Binario Generado (Hexdump)"
          badge={<Chip label="programa.exe" variant="violet" />}
        >
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Instrucciones de 8 bytes little-endian codificadas según la ISA:
          </p>
          <pre
            className="font-mono"
            style={{
              padding: '16px',
              backgroundColor: 'var(--panel-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--cyan)',
              wordBreak: 'break-all',
              fontSize: '0.85rem',
              lineHeight: '1.8',
            }}
          >
            {hexBytes}
          </pre>
        </Panel>

        {/* Consola de Salida de la VM */}
        <Panel
          title="Consola de la VM (Salida Estándar)"
          badge={<Chip label={consoleOpen ? 'Abierta' : 'Minimizada'} variant="green" />}
        >
          <div
            role="log"
            aria-label="Salida de consola"
            style={{
              padding: '16px',
              backgroundColor: '#0a0d18',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              minHeight: '140px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
              --- Ejecutando programa.exe en CompiLab VM (8 Registros) ---
            </div>
            {stdout.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                Programa terminó con código {exitCode} (sin salida print).
              </div>
            ) : (
              stdout.map((line, idx) => (
                <div key={idx} style={{ color: 'var(--green)', fontWeight: 600 }}>
                  &gt; {line}
                </div>
              ))
            )}
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '8px' }}>
              [Proceso finalizado con código de salida {exitCode}]
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};
