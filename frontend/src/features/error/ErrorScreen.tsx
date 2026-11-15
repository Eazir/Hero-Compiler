import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompileStore } from '../../state/compileStore';
import { Panel } from '../../ui/Panel';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { es } from '../../i18n/es';

export const ErrorScreen: React.FC = () => {
  const navigate = useNavigate();
  const { trace } = useCompileStore();

  const error = trace?.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--red)' }}>
            {es.app.nav.error}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            El compilador detectó un problema que impide generar el ejecutable.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/')}>
          ← Corregir en el Editor
        </Button>
      </header>

      {error ? (
        <Panel
          title={`Error ${error.code}: ${error.kind.toUpperCase()}`}
          badge={<Chip label={`Fase: ${error.phase}`} variant="red" />}
        >
          <div
            role="alert"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '20px',
              backgroundColor: 'rgba(255, 111, 125, 0.08)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Mensaje del Compilador
              </span>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--red)', marginTop: '4px' }}>
                {error.message}
              </h3>
            </div>

            {error.span && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                📍 Ubicación: Línea {error.span.line}, Columna {error.span.col} (Largo: {error.span.len})
              </div>
            )}

            <div>
              <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>¿Por qué ocurre?</strong>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                {error.why}
              </p>
            </div>

            <div>
              <strong style={{ color: 'var(--amber)', fontSize: '0.9rem' }}>💡 Sugerencia:</strong>
              <p style={{ color: 'var(--text)', fontSize: '0.875rem', marginTop: '4px' }}>
                {error.hint}
              </p>
            </div>

            {error.fixes && error.fixes.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong style={{ color: 'var(--cyan)', fontSize: '0.9rem' }}>Correcciones Sugeridas:</strong>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {error.fixes.map((fix: any, idx: number) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/')}
                    >
                      {fix.label || `Aplicar corrección #${idx + 1}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="Sin Errores">
          <p style={{ color: 'var(--muted)' }}>
            No hay ningún error registrado en este momento.
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Ir al Editor
          </Button>
        </Panel>
      )}
    </div>
  );
};
