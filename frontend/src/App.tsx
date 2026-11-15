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
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: 'var(--font-ui)',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    color: isActive ? 'var(--amber)' : 'var(--muted)',
    backgroundColor: isActive ? 'var(--panel-2)' : 'transparent',
    border: `1px solid ${isActive ? 'var(--amber)' : 'transparent'}`,
    transition: 'all var(--motion-fast)',
  });

  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100vh',
      }}
    >
      {/* Barra superior de navegación y estado */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '16px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--amber)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {es.app.title}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{es.app.subtitle}</p>
          </div>
          <Chip label="v1.0" variant="cyan" />
        </div>

        {/* Enlaces de navegación entre las 4 pantallas */}
        <nav aria-label="Navegación principal">
          <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0, alignItems: 'center' }}>
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
        <span>CompiLab &copy; 2026 — MiniArit Compiler Simulator</span>
        <span>7 fases de compilación &bull; ISA 8-bytes &bull; 8 Registros</span>
      </footer>
    </div>
  );
};
