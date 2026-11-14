import React, { useEffect, useState } from 'react';
import { useCompileStore } from './state/compileStore';
import { useProgramStore } from './state/programStore';
import { toSource } from './domain/serialize';
import { PHASES_META } from './domain/phases';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { Chip } from './ui/Chip';
import { es } from './i18n/es';
import okBasic from '../../contract/fixtures/ok_basic.json';

export const App: React.FC = () => {
  const { program, loadDefaultExample } = useProgramStore();
  const { trace, status, errorMessage, compileSource, setTrace } = useCompileStore();
  const [selectedPhase, setSelectedPhase] = useState<string>('lexical');

  useEffect(() => {
    // En F0 cargamos la fixture básica inicial para verificar el contrato
    setTrace(okBasic as any);
  }, [setTrace]);

  const handleCompile = async () => {
    const { text } = toSource(program);
    await compileSource(text, true);
  };

  const handleLoadSemanticError = async () => {
    await compileSource('a = d + 1', true);
  };

  const handleLoadSyntacticError = async () => {
    await compileSource('c = + 2', true);
  };

  const currentPhaseData = trace?.phases.find((p) => p.id === selectedPhase);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--amber)', letterSpacing: '-0.02em' }}>
            {es.app.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{es.app.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Chip label="Contrato v1" variant="cyan" />
          <Chip label={status === 'done' ? 'Compilado OK' : status === 'failed' ? 'Error detectado' : 'Listo'} variant={status === 'done' ? 'green' : status === 'failed' ? 'red' : 'default'} />
        </div>
      </header>

      {/* Controles de compilación */}
      <Panel title="Controles y Fixtures">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" onClick={handleCompile} disabled={status === 'loading'}>
            {status === 'loading' ? es.app.actions.compiling : 'Compilar Programa'}
          </Button>
          <Button variant="secondary" onClick={loadDefaultExample}>
            Programa Válido (c = a + b * 2)
          </Button>
          <Button variant="secondary" onClick={handleLoadSemanticError}>
            Probar Error Semántico (E-301)
          </Button>
          <Button variant="secondary" onClick={handleLoadSyntacticError}>
            Probar Error Sintáctico (E-201)
          </Button>
        </div>
        {errorMessage && (
          <div role="alert" style={{ padding: '12px', backgroundColor: 'rgba(255, 111, 125, 0.15)', border: '1px solid var(--red)', borderRadius: 'var(--radius-md)', color: 'var(--red)' }}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}
      </Panel>

      {/* Stepper de las 7 Fases */}
      <Panel title="Fases del Compilador (Orden Canónico)">
        <nav aria-label="Fases del compilador">
          <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', listStyle: 'none' }}>
            {PHASES_META.map((meta) => {
              const phaseResult = trace?.phases.find((p) => p.id === meta.id);
              const isSelected = selectedPhase === meta.id;
              const phaseStatus = phaseResult?.status || 'skipped';

              const getStatusColor = () => {
                if (phaseStatus === 'ok') return 'var(--green)';
                if (phaseStatus === 'error') return 'var(--red)';
                return 'var(--muted)';
              };

              return (
                <li
                  key={meta.id}
                  onClick={() => setSelectedPhase(meta.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--line)'}`,
                    backgroundColor: isSelected ? 'var(--panel-2)' : 'rgba(22, 28, 48, 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'border-color var(--motion-fast)',
                  }}
                  aria-current={isSelected ? 'step' : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Fase {meta.order + 1}</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor() }} />
                  </div>
                  <strong style={{ fontSize: '0.875rem', color: isSelected ? 'var(--amber)' : 'var(--text)' }}>
                    {meta.name}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: getStatusColor(), textTransform: 'uppercase', fontWeight: 600 }}>
                    {phaseStatus}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      </Panel>

      {/* Detalle de la fase seleccionada */}
      {currentPhaseData && (
        <Panel
          title={`${currentPhaseData.name} — Detalle de Traza`}
          badge={<Chip label={`Status: ${currentPhaseData.status}`} variant={currentPhaseData.status === 'ok' ? 'green' : currentPhaseData.status === 'error' ? 'red' : 'default'} />}
        >
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{currentPhaseData.summary}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <h4 style={{ fontSize: '0.875rem', color: 'var(--amber)', textTransform: 'uppercase' }}>Pasos Registrados ({currentPhaseData.steps.length}):</h4>
            {currentPhaseData.steps.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>No se registraron pasos (fase omitida o vacía).</p>
            ) : (
              currentPhaseData.steps.map((st) => (
                <div
                  key={st.i}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--panel-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>#{st.i} {st.title}</strong>
                  <p style={{ color: 'var(--muted)', marginTop: '4px' }}>{st.explain}</p>
                </div>
              ))
            )}
          </div>
        </Panel>
      )}

      {/* Error Card si ok: false */}
      {trace && !trace.ok && trace.error && (
        <Panel title={`Error ${trace.error.code} (${trace.error.kind})`}>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255, 111, 125, 0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ color: 'var(--red)', fontSize: '1rem', marginBottom: '8px' }}>{trace.error.message}</h4>
            <p style={{ color: 'var(--text)', marginBottom: '8px' }}><strong>¿Por qué ocurre?</strong> {trace.error.why}</p>
            <p style={{ color: 'var(--muted)' }}><strong>Sugerencia:</strong> {trace.error.hint}</p>
          </div>
        </Panel>
      )}

      {/* Ejecutable y Salida si ok: true */}
      {trace && trace.ok && trace.executable && (
        <Panel title="Binario Generado y Ejecución en VM">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--panel-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tamaño: {trace.executable.size} bytes</span>
              <pre className="font-mono" style={{ color: 'var(--cyan)', marginTop: '8px', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                {trace.executable.hex}
              </pre>
            </div>
            {trace.run && (
              <div style={{ padding: '12px', backgroundColor: '#000000', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Consola (Exit: {trace.run.exitCode})</span>
                <div className="font-mono" style={{ color: 'var(--green)', marginTop: '8px', fontSize: '0.9rem' }}>
                  {trace.run.stdout.map((line, idx) => (
                    <div key={idx}>&gt; {line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};
