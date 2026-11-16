import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { useCompileStore } from './state/compileStore';
import { EditorScreen } from './features/editor/EditorScreen';
import { ArenaScreen } from './features/arena/ArenaScreen';
import { ResultScreen } from './features/result/ResultScreen';
import { ErrorScreen } from './features/error/ErrorScreen';
import { Chip } from './ui/Chip';
import { es } from './i18n/es';

export const App: React.FC = () => {
  const { status, trace } = useCompileStore();

  const getStatusChip = () => {
    switch (status) {
      case 'loading':
        return <Chip label="Compilando..." variant="amber" />;
      case 'done':
        return <Chip label="Compilado OK" variant="green" />;
      case 'failed':
        return <Chip label="Error detectado" variant="red" />;
      case 'idle':
      default:
        return <Chip label="Listo" variant="default" />;
    }
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: isActive ? 600 : 500,
    fontFamily: 'var(--font-ui)',
    minHeight: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    color: isActive ? 'var(--text-pure)' : 'var(--muted-light)',
    backgroundColor: isActive ? 'var(--panel-2)' : 'transparent',
    border: `1px solid ${isActive ? 'var(--line-strong)' : 'transparent'}`,
    transition: 'background-color var(--motion-fast), color var(--motion-fast)',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div
      style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '12px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: '100vh',
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* Barra superior compacta estilo Workbench */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: 'var(--green-vibrant)',
              flexShrink: 0,
            }}
          />
          <h1
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-pure)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {es.app.title}
          </h1>
          <span style={{ color: 'var(--line-strong)', fontSize: '0.85rem' }}>/</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            MiniArit ISA-64
          </span>
        </div>

        {/* Enlaces de navegación entre las 4 pantallas */}
        <nav aria-label="Navegación principal" style={{ minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
          <ul
            style={{
              display: 'flex',
              gap: '4px',
              listStyle: 'none',
              padding: '2px',
              margin: 0,
              alignItems: 'center',
              flexWrap: 'wrap',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <li>
              <NavLink to="/" style={navLinkStyle}>
                {es.app.nav.editor}
              </NavLink>
            </li>
            <li>
              <NavLink to="/arena" style={navLinkStyle}>
                {es.app.nav.arena}
              </NavLink>
            </li>
            <li>
              <NavLink to="/resultado" style={navLinkStyle}>
                {es.app.nav.result}
              </NavLink>
            </li>
            {trace && !trace.ok && (
              <li>
                <NavLink to="/error" style={navLinkStyle}>
                  {es.app.nav.error}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusChip()}
        </div>
      </header>

      {/* Contenido principal según la ruta activa */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<EditorScreen />} />
          <Route path="/arena" element={<ArenaScreen />} />
          <Route path="/resultado" element={<ResultScreen />} />
          <Route path="/error" element={<ErrorScreen />} />
          <Route path="*" element={<EditorScreen />} />
        </Routes>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--muted)',
        }}
      >
        <span>Hero-Compiler &copy; 2026 — MiniArit Compiler Simulator &amp; Mini-Games</span>
        <span>7 fases de compilación &bull; ISA 8-bytes &bull; 8 Registros</span>
      </footer>
    </div>
  );
};
