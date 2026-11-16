import React, { useState } from 'react';
import { CompileResponse } from '../../api/schema';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';

interface VirtualDesktopProps {
  trace: CompileResponse;
  defaultConsoleOpen?: boolean;
}

export const VirtualDesktop: React.FC<VirtualDesktopProps> = ({
  trace,
  defaultConsoleOpen = false,
}) => {
  const [consoleOpen, setConsoleOpen] = useState(defaultConsoleOpen);
  const [inspectorTab, setInspectorTab] = useState<'none' | 'bin' | 'asm'>('none');
  const [runCount, setRunCount] = useState(defaultConsoleOpen ? 1 : 0);

  const hexBytes = trace.executable?.hex || '';
  const sizeBytes = trace.executable?.size || 0;
  const stdout = trace.run?.stdout || [];
  const exitCode = trace.run?.exitCode ?? 0;
  const vmSteps = trace.run?.steps || [];
  const asmPhase = trace.phases.find((p) => p.id === 'assembly');
  const asmInstructions: Array<{ pc: number; text: string }> =
    asmPhase?.output?.instructions || [];

  const handleExecuteExe = () => {
    setConsoleOpen(true);
    setRunCount((c) => c + 1);
  };

  return (
    <div
      aria-label="Escritorio Virtual Hero-OS"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--line-strong)',
        boxShadow: 'var(--shadow-lg)',
        background:
          'radial-gradient(circle at 18% 20%, rgba(16, 185, 129, 0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(37, 99, 235, 0.24), transparent 50%), #070d19',
        minHeight: '360px',
      }}
    >
      {/* Barra superior del Escritorio */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🖥️</span>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-pure)' }}>
            Escritorio de Ejecución — Hero-OS
          </strong>
          <Chip label={`${sizeBytes} bytes`} variant="cyan" />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Haz clic en <strong>programa.exe</strong> para ejecutar el binario en la consola:
          </span>
          <Button variant="primary" size="sm" onClick={handleExecuteExe}>
            ▶ Ejecutar programa.exe
          </Button>
        </div>
      </div>

      {/* Área principal del Escritorio: Iconos a la izquierda + Ventana de Consola a la derecha */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: consoleOpen
            ? 'minmax(180px, 230px) 1fr'
            : '1fr',
          gap: '20px',
          padding: '20px',
          alignItems: 'start',
        }}
      >
        {/* Columna de Iconos del Escritorio */}
        <div
          style={{
            display: 'flex',
            flexDirection: consoleOpen ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Icono 1: Ejecutable programa.exe */}
          <button
            type="button"
            onClick={handleExecuteExe}
            onDoubleClick={handleExecuteExe}
            aria-label="Ejecutar programa.exe"
            title="Haz clic o doble clic para ejecutar programa.exe en la consola"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 16px',
              width: '150px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: consoleOpen
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(15, 23, 42, 0.75)',
              border: consoleOpen
                ? '2px solid var(--green)'
                : '1px solid rgba(56, 189, 248, 0.4)',
              color: 'var(--text-pure)',
              cursor: 'pointer',
              boxShadow: consoleOpen
                ? '0 0 20px rgba(16, 185, 129, 0.3)'
                : 'var(--shadow-sm)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>🚀</span>
            <strong
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                color: '#FFFFFF',
              }}
            >
              programa.exe
            </strong>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--green)',
                fontWeight: 700,
              }}
            >
              ▶ Click para Ejecutar
            </span>
          </button>

          {/* Icono 2: Archivo Binario programa.bin */}
          <button
            type="button"
            onClick={() => setInspectorTab(inspectorTab === 'bin' ? 'none' : 'bin')}
            aria-label="Inspeccionar programa.bin"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 16px',
              width: '150px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                inspectorTab === 'bin'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'rgba(15, 23, 42, 0.65)',
              border:
                inspectorTab === 'bin'
                  ? '2px solid var(--blue-bright)'
                  : '1px solid var(--line)',
              color: 'var(--text-pure)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>📦</span>
            <strong
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--blue-bright)',
              }}
            >
              programa.bin
            </strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              Binario ({sizeBytes} B)
            </span>
          </button>

          {/* Icono 3: Archivo Ensamblador programa.asm */}
          <button
            type="button"
            onClick={() => setInspectorTab(inspectorTab === 'asm' ? 'none' : 'asm')}
            aria-label="Inspeccionar programa.asm"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 16px',
              width: '150px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                inspectorTab === 'asm'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'rgba(15, 23, 42, 0.65)',
              border:
                inspectorTab === 'asm'
                  ? '2px solid var(--blue-bright)'
                  : '1px solid var(--line)',
              color: 'var(--text-pure)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>📄</span>
            <strong
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--text)',
              }}
            >
              programa.asm
            </strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              {asmInstructions.length} instr. ISA
            </span>
          </button>
        </div>

        {/* Ventana de Consola cuando se ejecuta programa.exe */}
        {consoleOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--green)',
              backgroundColor: '#050911',
              boxShadow: '0 14px 35px rgba(0, 0, 0, 0.65)',
            }}
          >
            {/* Barra de título de la ventana de Consola */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 14px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--green)',
                    display: 'inline-block',
                  }}
                />
                <strong
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#FFFFFF',
                  }}
                >
                  Consola Hero-OS — C:\build\programa.exe (Ejecución #{Math.max(1, runCount)})
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setConsoleOpen(false)}
                title="Cerrar ventana de consola"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                ×
              </button>
            </div>

            {/* Cuerpo de la Consola (role="log") */}
            <div
              role="log"
              aria-label="Salida de consola"
              style={{
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: '190px',
              }}
            >
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                hero-os@vm:~$ ./programa.exe --isa-8byte
              </div>
              <div style={{ color: 'var(--blue-bright)', fontSize: '0.78rem' }}>
                [VM] Binario cargado ({sizeBytes} bytes, {vmSteps.length} ciclos ejecutados).
              </div>

              {/* Salida estándar grande y clara */}
              <div
                style={{
                  margin: '6px 0',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderLeft: '4px solid var(--green)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Salida del Programa (STDOUT):
                </span>
                {stdout.length === 0 ? (
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                    (El programa no ejecutó instrucciones print)
                  </span>
                ) : (
                  stdout.map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        color: 'var(--green-bright)',
                        fontWeight: 800,
                        fontSize: '1.35rem',
                      }}
                    >
                      &gt; {line}
                    </div>
                  ))
                )}
              </div>

              {/* Traza resumida de registros al finalizar */}
              {vmSteps.length > 0 && (
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '4px' }}>
                  Estado final de registros:{' '}
                  {vmSteps[vmSteps.length - 1].registers
                    .map((val, rIdx) => `R${rIdx}=${val}`)
                    .join(' | ')}
                </div>
              )}

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: exitCode === 0 ? 'var(--green)' : 'var(--red)',
                  fontSize: '0.8rem',
                }}
              >
                [Proceso programa.exe terminó con código {exitCode}]
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspector opcional de archivo .bin o .asm cuando se hace clic en sus iconos */}
      {inspectorTab !== 'none' && (
        <div
          style={{
            margin: '0 20px 20px 20px',
            padding: '14px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid var(--blue-bright)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.84rem',
          }}
        >
          {inspectorTab === 'bin' ? (
            <div>
              <strong style={{ color: 'var(--blue-bright)' }}>
                📦 Contenido hexadecimal de programa.bin ({sizeBytes} bytes):
              </strong>
              <div style={{ color: '#FFFFFF', marginTop: '6px', wordBreak: 'break-all' }}>
                {hexBytes}
              </div>
            </div>
          ) : (
            <div>
              <strong style={{ color: 'var(--blue-bright)' }}>
                📄 Listado de programa.asm:
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {asmInstructions.map((ins) => (
                  <div key={ins.pc} style={{ color: '#FFFFFF' }}>
                    0x{(ins.pc * 8).toString(16).padStart(2, '0').toUpperCase()}: {ins.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de tareas inferior estilo Sistema Operativo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: 'rgba(9, 13, 26, 0.95)',
          borderTop: '1px solid var(--line)',
          fontSize: '0.75rem',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>● Hero-OS VM v1.0</span>
          <span>ISA: 8-Bytes Little-Endian</span>
          <span>Registros: R0–R7</span>
        </div>
        <div>
          Estado Consola: {consoleOpen ? '🟢 En ejecución / Abierta' : '⚪ Lista para abrir (haz clic en programa.exe)'}
        </div>
      </div>
    </div>
  );
};
