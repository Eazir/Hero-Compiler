import React from 'react';
import { useNavigate } from 'react-router-dom';
import { es } from '../../i18n/es';
import { useCompileStore } from '../../state/compileStore';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { VirtualDesktop } from './VirtualDesktop';

export const ResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const { trace } = useCompileStore();

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

  const sizeBytes = trace.executable?.size || 0;
  const exitCode = trace.run?.exitCode ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {es.app.nav.result}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Escritorio Virtual y Ejecución del Binario en la Máquina Virtual Hero-Compiler.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/arena')}>
            ← Volver a la Arena
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

      {/* Escritorio Virtual con programa.bin, programa.exe y Consola */}
      <VirtualDesktop trace={trace} defaultConsoleOpen={true} />
    </div>
  );
};
