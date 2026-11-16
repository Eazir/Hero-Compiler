import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhaseResult } from '../../api/schema';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ErrorFeedbackModal, GameMistakeFeedback } from './ErrorFeedbackModal';

interface PhaseMiniGameProps {
  phase: PhaseResult;
  onCompletePhase?: () => void;
  onSyncStepIndex?: (stepIdx: number) => void;
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 7px',
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid var(--blue-bright)',
  borderRadius: '4px',
  color: '#FFFFFF',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  fontSize: '0.72rem',
  boxShadow: '0 2px 0 rgba(0, 0, 0, 0.5)',
};

// ============================================================================
// 1. FASE LÉXICA: 🚀 SPACE LEXER (Juego de Navecitas Arcade y Disparos en Carriles)
// ============================================================================
type LaserCannonType = 'ID' | 'NUM' | 'OP' | 'RES';

interface CannonDef {
  id: LaserCannonType;
  name: string;
  shortName: string;
  color: string;
  desc: string;
}

const CANNONS: CannonDef[] = [
  {
    id: 'ID',
    name: 'CAÑÓN ID',
    shortName: 'ID',
    color: '#38BDF8',
    desc: 'Identificador de variable (como a, b, c, x)',
  },
  {
    id: 'NUM',
    name: 'CAÑÓN NUM',
    shortName: 'NUM',
    color: '#818CF8',
    desc: 'Constante numérica entera (como 5, 3, 2)',
  },
  {
    id: 'OP',
    name: 'CAÑÓN OP',
    shortName: 'OP',
    color: '#F59E0B',
    desc: 'Operador aritmético o símbolo (=, +, -, *, paréntesis)',
  },
  {
    id: 'RES',
    name: 'CAÑÓN RES',
    shortName: 'RES',
    color: '#10B981',
    desc: 'Palabra reservada del lenguaje (print, salto de línea)',
  },
];

function mapTokenToCannon(tokenType: string): LaserCannonType {
  if (tokenType === 'ID') return 'ID';
  if (tokenType === 'NUM') return 'NUM';
  if (tokenType === 'PRINT' || tokenType === 'NEWLINE') return 'RES';
  return 'OP';
}

const SpaceLexerGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const tokens: Array<{ type: string; lexeme: string; line: number; col: number }> = useMemo(() => {
    const raw = phase.output?.tokens || [];
    return raw.filter((t: any) => t.type !== 'EOF');
  }, [phase]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedCannon, setSelectedCannon] = useState<LaserCannonType>('ID');
  const [shipLane, setShipLane] = useState(0);
  const [meteorY, setMeteorY] = useState(12); // porcentaje de caída (12% a 70%)
  const [laserShotAnim, setLaserShotAnim] = useState<number | null>(null);
  const [hitExplosion, setHitExplosion] = useState<number | null>(null);
  const [destroyedTokens, setDestroyedTokens] = useState<string[]>([]);

  const activeToken = tokens[currentIdx];
  const targetLane = (currentIdx * 3) % 4;

  // Caída animada del token meteorito hacia la línea de defensa
  useEffect(() => {
    setMeteorY(12);
    const interval = setInterval(() => {
      setMeteorY((y) => {
        if (y >= 70) return 70;
        return y + 1.6;
      });
    }, 140);
    return () => clearInterval(interval);
  }, [currentIdx]);

  const handleFireAtMeteor = (cannonToUse: LaserCannonType, laneToShoot: number) => {
    if (!activeToken) return;

    const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n' : activeToken.lexeme;

    // Disparo en carril vacío
    if (laneToShoot !== targetLane) {
      setLaserShotAnim(laneToShoot);
      setTimeout(() => setLaserShotAnim(null), 250);
      onMistake({
        phaseName: 'Análisis Léxico (Space Lexer)',
        stepTitle: `Disparo en Carril Vacío #${laneToShoot + 1}`,
        userAnswer: `Disparaste en el Carril ${laneToShoot + 1} donde no hay ningún meteorito activo`,
        whatWentWrong: `Tu nave disparó al vacío en el carril ${laneToShoot + 1}, mientras el meteorito "${lexDisplay}" desciende por el carril ${targetLane + 1}.`,
        whatShouldBeDone: `Usa las flechas ◀ / ▶ o A / D del teclado para mover la nave al carril ${targetLane + 1}, cambia el cañón con TAB y dispara con ESPACIO.`,
      });
      return;
    }

    const expectedCannon = mapTokenToCannon(activeToken.type);

    // Disparo en el carril correcto con el cañón correcto
    if (cannonToUse === expectedCannon) {
      setLaserShotAnim(laneToShoot);
      setHitExplosion(targetLane);
      setTimeout(() => {
        setLaserShotAnim(null);
        setHitExplosion(null);
      }, 260);

      const nextList = [...destroyedTokens, `${lexDisplay}→${activeToken.type}`];
      setDestroyedTokens(nextList);
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      onStepProgress(nextIdx);
      if (nextIdx >= tokens.length) {
        onWin();
      }
    } else {
      // Disparo en el carril correcto con el cañón incorrecto
      setLaserShotAnim(laneToShoot);
      setTimeout(() => setLaserShotAnim(null), 250);
      const chosenDef = CANNONS.find((c) => c.id === cannonToUse)!;
      const rightDef = CANNONS.find((c) => c.id === expectedCannon)!;
      onMistake({
        phaseName: 'Análisis Léxico (Space Lexer)',
        stepTitle: `Meteorito #${currentIdx + 1}: "${lexDisplay}" (Línea ${activeToken.line}, Col ${activeToken.col})`,
        userAnswer: `Disparaste con el ${chosenDef.name}`,
        whatWentWrong: `El rayo láser rebotó en el escudo magnético del meteorito "${lexDisplay}". El lexema no pertenece a la categoría ${chosenDef.id} (${chosenDef.desc}).`,
        whatShouldBeDone: `Para clasificar el lexema "${lexDisplay}" (token ${activeToken.type}), equipa tu nave con el ${rightDef.name} pulsando TAB o las teclas 1-4 y dispara con ESPACIO.`,
      });
    }
  };

  // Referencias para evitar cierres obsoletos en los atajos de teclado
  const latestRef = useRef({
    shipLane,
    selectedCannon,
    handleFireAtMeteor,
  });
  useEffect(() => {
    latestRef.current = {
      shipLane,
      selectedCannon,
      handleFireAtMeteor,
    };
  });

  // Escuchador global de teclado: Flechas, Espacio, Tab y Teclas numéricas 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setShipLane((l) => Math.max(0, l - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setShipLane((l) => Math.min(3, l + 1));
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const { selectedCannon: sc, shipLane: sl, handleFireAtMeteor: hf } = latestRef.current;
        hf(sc, sl);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const list: LaserCannonType[] = ['ID', 'NUM', 'OP', 'RES'];
        setSelectedCannon((curr) => {
          const nextIdx = (list.indexOf(curr) + 1) % list.length;
          return list[nextIdx];
        });
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, LaserCannonType> = {
          '1': 'ID',
          '2': 'NUM',
          '3': 'OP',
          '4': 'RES',
        };
        setSelectedCannon(map[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!activeToken) return null;

  const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n (Salto)' : `"${activeToken.lexeme}"`;
  const nextMeteor1 = tokens[currentIdx + 1];
  const nextMeteor2 = tokens[currentIdx + 2];
  const activeCannonColor = CANNONS.find((c) => c.id === selectedCannon)?.color || '#38BDF8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--blue-bright)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES ARCADE:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> Mover Nave
          </span>
          <span>
            <kbd style={kbdStyle}>ESPACIO</kbd> Disparar Láser
          </span>
          <span>
            <kbd style={kbdStyle}>TAB</kbd> Cambiar Cañón (o <kbd style={kbdStyle}>1-4</kbd>)
          </span>
        </div>
      </div>

      {/* Arena de Combate Espacial Arcade de Pantalla Larga */}
      <div
        style={{
          position: 'relative',
          minHeight: '460px',
          height: '460px',
          borderRadius: 'var(--radius-md)',
          background:
            'radial-gradient(circle at 50% 12%, rgba(37, 99, 235, 0.35), rgba(4, 8, 19, 0.98) 75%)',
          border: '1px solid var(--blue-bright)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(15, 23, 42, 0.8)',
        }}
      >
        {/* Cabecera del radar espacial */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            zIndex: 4,
          }}
        >
          <span
            style={{
              fontSize: '0.84rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--blue-bright)',
              fontWeight: 800,
              textShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
            }}
          >
            🚀 SPACE LEXER — Meteorito {currentIdx + 1} de {tokens.length} | Carril Activo: #{targetLane + 1}
          </span>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--muted)',
            }}
          >
            <span>Próximos en radar:</span>
            {nextMeteor1 && (
              <Chip label={nextMeteor1.type === 'NEWLINE' ? '\\n' : nextMeteor1.lexeme} variant="default" />
            )}
            {nextMeteor2 && (
              <Chip label={nextMeteor2.type === 'NEWLINE' ? '\\n' : nextMeteor2.lexeme} variant="default" />
            )}
          </div>
        </div>

        {/* 4 Pistas Verticales de Caída y Combate */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            margin: '12px 0',
            position: 'relative',
          }}
        >
          {[0, 1, 2, 3].map((lane) => {
            const hasMeteor = lane === targetLane;
            const isShipHere = lane === shipLane;

            return (
              <div
                key={lane}
                onClick={() => setShipLane(lane)}
                style={{
                  height: '100%',
                  borderRadius: 'var(--radius-sm)',
                  border: hasMeteor
                    ? '2px dashed rgba(56, 189, 248, 0.65)'
                    : '1px dashed rgba(255, 255, 255, 0.08)',
                  backgroundColor: hasMeteor
                    ? 'rgba(37, 99, 235, 0.12)'
                    : 'rgba(15, 23, 42, 0.45)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {/* Indicador superior del carril */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: hasMeteor ? 'var(--blue-bright)' : 'var(--muted)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    marginTop: '8px',
                    zIndex: 2,
                  }}
                >
                  CARRIL {lane + 1}
                </span>

                {/* Línea central de radar de la pista */}
                <div
                  style={{
                    position: 'absolute',
                    top: '30px',
                    bottom: '70px',
                    width: '1px',
                    borderLeft: '1px dashed rgba(255, 255, 255, 0.12)',
                  }}
                />

                {/* Meteorito cayendo hacia la nave */}
                {hasMeteor && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${meteorY}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      transition: 'top 0.14s linear',
                      zIndex: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFireAtMeteor(selectedCannon, lane);
                      }}
                      aria-label={`Disparar al meteorito ${lexDisplay}`}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '999px',
                        background:
                          meteorY > 58
                            ? 'linear-gradient(135deg, #7F1D1D, #991B1B)'
                            : 'linear-gradient(135deg, #1E293B, #0F172A)',
                        border: `2px solid ${meteorY > 58 ? '#EF4444' : 'var(--blue-bright)'}`,
                        boxShadow:
                          meteorY > 58
                            ? '0 0 25px rgba(239, 68, 68, 0.85)'
                            : '0 0 20px rgba(56, 189, 248, 0.55)',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        cursor: 'crosshair',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>☄️</span>
                      <span>{lexDisplay}</span>
                    </button>
                    {meteorY > 55 && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#EF4444',
                          fontWeight: 800,
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        ⚠️ ZONA DE IMPACTO
                      </span>
                    )}
                  </div>
                )}

                {/* Efecto de Explosión al derribar el meteorito */}
                {hitExplosion === lane && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${meteorY}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '3rem',
                      zIndex: 15,
                      filter: 'drop-shadow(0 0 20px #F59E0B)',
                    }}
                  >
                    💥
                  </div>
                )}

                {/* Rayo láser disparado por la nave */}
                {laserShotAnim === lane && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '50px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '6px',
                      height: '320px',
                      background: `linear-gradient(to top, ${activeCannonColor}, #FFFFFF)`,
                      boxShadow: `0 0 20px ${activeCannonColor}, 0 0 35px ${activeCannonColor}`,
                      borderRadius: '999px',
                      zIndex: 7,
                    }}
                  />
                )}

                {/* Posición de la Nave espacial en la línea defensiva inferior */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    zIndex: 9,
                  }}
                >
                  {isShipHere ? (
                    <>
                      <span
                        style={{
                          fontSize: '2.2rem',
                          filter: `drop-shadow(0 0 14px ${activeCannonColor})`,
                          userSelect: 'none',
                        }}
                      >
                        🛸
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          color: activeCannonColor,
                          fontWeight: 800,
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${activeCannonColor}`,
                        }}
                      >
                        {selectedCannon}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)' }}>▲</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Controles de cabina en pantalla: Mover / Disparar / Mover */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            zIndex: 4,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShipLane((l) => Math.max(0, l - 1))}
          >
            ◀ Mover Nave Izq (o tecla ◀)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleFireAtMeteor(selectedCannon, shipLane)}
          >
            🔥 DISPARAR CAÑÓN {selectedCannon} [ESPACIO]
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShipLane((l) => Math.min(3, l + 1))}
          >
            Mover Nave Der ▶ (o tecla ▶)
          </Button>
        </div>
      </div>

      {/* Bahía de los 4 Cañones Láser — Solo muestra el nombre sin descripción */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}
      >
        {CANNONS.map((cannon, cIdx) => {
          const isSelected = selectedCannon === cannon.id;
          return (
            <button
              key={cannon.id}
              type="button"
              onClick={() => {
                setSelectedCannon(cannon.id);
                handleFireAtMeteor(cannon.id, shipLane);
              }}
              style={{
                textAlign: 'center',
                padding: '12px 10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isSelected
                  ? 'rgba(37, 99, 235, 0.35)'
                  : 'rgba(15, 23, 42, 0.88)',
                border: `2px solid ${isSelected ? cannon.color : 'var(--line)'}`,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: isSelected ? `0 0 16px ${cannon.color}55` : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: cannon.color,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {cannon.shortName === 'ID' && '⚡'}
                {cannon.shortName === 'NUM' && '🟣'}
                {cannon.shortName === 'OP' && '🟠'}
                {cannon.shortName === 'RES' && '🟢'}{' '}
                {cannon.name}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                [TAB o Tecla {cIdx + 1}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 2. FASE SINTÁCTICA: 🕸️ AST CONSTELLATION (Conectar Puntos en Mapa Estelar)
// ============================================================================
interface StarPoint {
  id: string;
  label: string;
  role: 'parent' | 'child';
  x: number;
  y: number;
}

interface ConstellationEdge {
  id: string;
  parentId: string;
  childId: string;
  parentLabel: string;
  childLabel: string;
  explain: string;
}

const AstConstellationGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const { points, edges } = useMemo(() => {
    const stmts: any[] = phase.output?.ast?.statements || [];
    const pts: StarPoint[] = [];
    const edgs: ConstellationEdge[] = [];

    stmts.forEach((stmt, idx) => {
      const baseX = stmts.length === 1 ? 50 : 16 + (idx * 68) / Math.max(1, stmts.length - 1);
      const stmtId = `stmt-${idx}`;
      const stmtLabel = stmt.kind === 'Assign' ? `${stmt.name} =` : `print()`;

      pts.push({
        id: stmtId,
        label: stmtLabel,
        role: 'parent',
        x: baseX,
        y: 18,
      });

      const expr = stmt.expr;
      if (expr?.kind === 'BinOp') {
        const opId = `op-${idx}`;
        const opLabel = `Op(${expr.op})`;
        pts.push({
          id: opId,
          label: opLabel,
          role: 'parent',
          x: baseX,
          y: 48,
        });

        const childId = `leaf-${idx}`;
        const rightText =
          expr.right?.kind === 'BinOp'
            ? `${expr.right.left?.name ?? expr.right.left?.value}${expr.right.op}${expr.right.right?.name ?? expr.right.right?.value}`
            : `${expr.right?.name ?? expr.right?.value ?? 'der'}`;
        const leftText = `${expr.left?.name ?? expr.left?.value ?? 'izq'}`;
        const childLabel = `${leftText}, ${rightText}`;

        pts.push({
          id: childId,
          label: childLabel,
          role: 'child',
          x: baseX,
          y: 80,
        });

        // Primero conectar el operador con sus operandos (de abajo hacia arriba) y luego la sentencia con el operador
        edgs.push({
          id: `edge-op-${idx}`,
          parentId: opId,
          childId: childId,
          parentLabel: opLabel,
          childLabel: childLabel,
          explain: `En la línea ${idx + 1}, primero debes conectar el nodo operador '${opLabel}' con sus operandos hijos '${childLabel}'.`,
        });

        edgs.push({
          id: `edge-stmt-${idx}`,
          parentId: stmtId,
          childId: opId,
          parentLabel: stmtLabel,
          childLabel: opLabel,
          explain: `Una vez agrupada la operación '${opLabel}', debes conectarla como hija del nodo de sentencia '${stmtLabel}'.`,
        });
      } else {
        const valId = `val-${idx}`;
        const valLabel =
          expr?.kind === 'Neg'
            ? `-${expr.operand?.name ?? expr.operand?.value ?? 'x'}`
            : `${expr?.name ?? expr?.value ?? '0'}`;

        pts.push({
          id: valId,
          label: valLabel,
          role: 'child',
          x: baseX,
          y: 72,
        });

        edgs.push({
          id: `edge-simple-${idx}`,
          parentId: stmtId,
          childId: valId,
          parentLabel: stmtLabel,
          childLabel: valLabel,
          explain: `En la sentencia #${idx + 1}, debes conectar el nodo padre '${stmtLabel}' con su valor hijo '${valLabel}'.`,
        });
      }
    });

    return { points: pts, edges: edgs };
  }, [phase]);

  const [completedEdgeIds, setCompletedEdgeIds] = useState<string[]>([]);
  const [selectedFirstPoint, setSelectedFirstPoint] = useState<StarPoint | null>(null);
  const [focusedPtIdx, setFocusedPtIdx] = useState(0);

  const nextRequiredEdge = edges[completedEdgeIds.length];

  const handleClickStarPoint = (pt: StarPoint) => {
    if (!nextRequiredEdge) return;

    // Primer clic: seleccionar punto de origen (Padre)
    if (!selectedFirstPoint) {
      setSelectedFirstPoint(pt);
      return;
    }

    // Si hace clic en el mismo punto, deselecciona
    if (selectedFirstPoint.id === pt.id) {
      setSelectedFirstPoint(null);
      return;
    }

    // Segundo clic: verificar si la conexión (selectedFirstPoint -> pt) es el enlace esperado
    const isExactMatch =
      selectedFirstPoint.id === nextRequiredEdge.parentId &&
      pt.id === nextRequiredEdge.childId;

    if (isExactMatch) {
      const nextCompleted = [...completedEdgeIds, nextRequiredEdge.id];
      setCompletedEdgeIds(nextCompleted);
      setSelectedFirstPoint(null);
      onStepProgress(nextCompleted.length);
      if (nextCompleted.length >= edges.length) {
        onWin();
      }
    } else {
      const fromLabel = selectedFirstPoint.label;
      const toLabel = pt.label;
      setSelectedFirstPoint(null);
      onMistake({
        phaseName: 'Análisis Sintáctico (AST Constellation)',
        stepTitle: `Enlace Estelar #${completedEdgeIds.length + 1} de ${edges.length}`,
        userAnswer: `Intentaste trazar un cable desde [${fromLabel}] hacia [${toLabel}]`,
        whatWentWrong:
          selectedFirstPoint.role === 'child'
            ? `Seleccionaste una hoja ('${fromLabel}') como nodo padre. En el árbol sintáctico (AST), los literales y variables son nodos hoja y no pueden tener hijos.`
            : `Conectaste '${fromLabel}' con '${toLabel}', rompiendo el orden jerárquico o de precedencia del árbol sintáctico.`,
        whatShouldBeDone: `${nextRequiredEdge.explain} Haz clic primero en la estrella [${nextRequiredEdge.parentLabel}] y luego en la estrella [${nextRequiredEdge.childLabel}].`,
      });
    }
  };

  // Referencia para evitar cierres obsoletos en los atajos de teclado
  const latestAstRef = useRef({
    focusedPtIdx,
    points,
    handleClickStarPoint,
  });
  useEffect(() => {
    latestAstRef.current = {
      focusedPtIdx,
      points,
      handleClickStarPoint,
    };
  });

  // Escuchador de teclado: Flechas ◀ / ▶ para seleccionar y ESPACIO / ENTER para conectar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const { points: pts, focusedPtIdx: fIdx, handleClickStarPoint: hClick } = latestAstRef.current;
      if (pts.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setFocusedPtIdx((i) => (i - 1 + pts.length) % pts.length);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'Tab') {
        e.preventDefault();
        setFocusedPtIdx((i) => (i + 1) % pts.length);
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (pts[fIdx]) {
          hClick(pts[fIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!nextRequiredEdge) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES TECLADO:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> Seleccionar Estrella
          </span>
          <span>
            <kbd style={kbdStyle}>ESPACIO</kbd> o <kbd style={kbdStyle}>ENTER</kbd> Conectar Nodo AST
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.16), #060b17 85%)',
          border: '1px solid var(--green)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>
            🕸️ CONSTELACIÓN AST (CONECTAR PUNTOS) — Cables {completedEdgeIds.length} / {edges.length}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--blue-bright)', fontFamily: 'var(--font-mono)' }}>
            {selectedFirstPoint
              ? `⚡ Origen fijado en [${selectedFirstPoint.label}] → Ahora conecta con el nodo hijo destino`
              : `Objetivo actual: Conecta [${nextRequiredEdge.parentLabel}] ➔ [${nextRequiredEdge.childLabel}]`}
          </span>
        </div>

        {/* Lienzo SVG Interactivo donde cada estrella es un punto clicable */}
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '260px',
            backgroundColor: 'rgba(5, 10, 22, 0.85)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line-strong)',
            userSelect: 'none',
          }}
        >
          {/* Cables ya conectados */}
          {edges.map((edg) => {
            const isDone = completedEdgeIds.includes(edg.id);
            const isNext = edg.id === nextRequiredEdge.id;
            const p1 = points.find((p) => p.id === edg.parentId);
            const p2 = points.find((p) => p.id === edg.childId);
            if (!p1 || !p2) return null;

            return (
              <g key={edg.id}>
                {(isDone || isNext) && (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isDone ? '#10B981' : 'rgba(56, 189, 248, 0.35)'}
                    strokeWidth={isDone ? '1.6' : '0.9'}
                    strokeDasharray={isDone ? undefined : '2 2'}
                  />
                )}
              </g>
            );
          })}

          {/* Puntos Estelares Interactivos */}
          {points.map((pt, pIdx) => {
            const isSelected = selectedFirstPoint?.id === pt.id;
            const isFocused = focusedPtIdx === pIdx;
            const isTargetParent = nextRequiredEdge.parentId === pt.id;
            const isTargetChild = nextRequiredEdge.childId === pt.id;

            return (
              <g
                key={pt.id}
                onClick={() => {
                  setFocusedPtIdx(pIdx);
                  handleClickStarPoint(pt);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Halo de foco por teclado */}
                {isFocused && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9.5"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="0.8"
                    strokeDasharray="1.5 1"
                  />
                )}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="0.9"
                    strokeDasharray="2 1"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5.2"
                  fill={
                    isSelected
                      ? '#38BDF8'
                      : isTargetParent || isTargetChild
                      ? '#10B981'
                      : '#1E293B'
                  }
                  stroke={isFocused ? '#10B981' : '#FFFFFF'}
                  strokeWidth="1.2"
                />
                <text
                  x={pt.x}
                  y={pt.y - 7.5}
                  fill="#FFFFFF"
                  fontSize="3.8"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Botones de Nodos Estelares accesibles por teclado y ratón */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
            Nodos en el mapa estelar (pulsa ◀ / ▶ o haz clic):
          </span>
          {points.map((pt, pIdx) => {
            const isSelected = selectedFirstPoint?.id === pt.id;
            const isFocused = focusedPtIdx === pIdx;
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => {
                  setFocusedPtIdx(pIdx);
                  handleClickStarPoint(pt);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  backgroundColor: isSelected
                    ? 'rgba(56, 189, 248, 0.28)'
                    : isFocused
                    ? 'rgba(16, 185, 129, 0.25)'
                    : 'rgba(15, 23, 42, 0.85)',
                  border: isSelected
                    ? '2px solid var(--blue-bright)'
                    : isFocused
                    ? '2px solid var(--green)'
                    : '1px solid var(--line-strong)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isFocused ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                ⭐ {pt.label} {isFocused ? '◀' : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FASE SEMÁNTICA: 🧭 SYMBOL MAZE (Laberinto 2D con Teclado Flechas y D-Pad)
// ============================================================================
const SymbolMazeGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const symbols: Array<{ name: string; type: string; line: number; uses: number }> = useMemo(
    () => phase.output?.symbols || [],
    [phase]
  );

  const [dronePos, setDronePos] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [collectedKeys, setCollectedKeys] = useState<string[]>([]);
  const [unlockedGates, setUnlockedGates] = useState<string[]>([]);

  const firstVar = symbols[0]?.name || 'a';
  const secondVar = symbols[1]?.name || firstVar;

  const tryMove = (targetR: number, targetC: number) => {
    if (targetR < 0 || targetR > 3 || targetC < 0 || targetC > 4) return;

    // Paredes del laberinto 4x5
    const walls = new Set(['0,2', '1,0', '2,1', '2,3', '3,2']);
    if (walls.has(`${targetR},${targetC}`)) {
      return;
    }

    // Trampa 1 en (0, 3): Leer variable fantasma 'z_undef' no declarada
    if (targetR === 0 && targetC === 3) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: 'Trampa de Memoria: Variable No Declarada (E-301)',
        userAnswer: 'Guiaste el dron hacia la celda de lectura de una variable sin declarar (z_undef)',
        whatWentWrong:
          'Intentaste leer en memoria una variable que no existe en la Tabla de Símbolos, lo cual dispara el error semántico E-301.',
        whatShouldBeDone: `Evita las celdas de variables no declaradas (☠️) y recoge primero las llaves 🔑 Declarar '${firstVar}' y 🔑 Declarar '${secondVar}'.`,
      });
      return;
    }

    // Trampa 2 en (3, 1): Tipo incompatible / lectura antes de asignar
    if (targetR === 3 && targetC === 1) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: 'Trampa de Alcance por Línea (E-301)',
        userAnswer: 'Intentaste usar una variable en una línea anterior a su asignación',
        whatWentWrong:
          'En MiniArit el alcance es secuencial por línea: una variable solo existe después de la línea donde se le asigna un valor.',
        whatShouldBeDone: `Sigue el corredor principal con las flechas del teclado recogiendo las llaves de declaración antes de cruzar compuertas.`,
      });
      return;
    }

    // Compuerta de lectura en (1, 3): requiere haber recogido ambas llaves
    if (targetR === 1 && targetC === 3 && !collectedKeys.includes(secondVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: `Compuerta de Uso: Leer '${secondVar}'`,
        userAnswer: `Intentaste cruzar la compuerta 'Usar ${secondVar}' sin haber recogido la llave 'Declarar ${secondVar}'`,
        whatWentWrong: `El analizador semántico consultó '${secondVar}' en la Tabla de Símbolos pero aún no la habías registrado (E-301).`,
        whatShouldBeDone: `Mueve el dron primero a la casilla 🔑 Declarar '${secondVar}' (fila 1, col 2) para registrarla en la Tabla de Símbolos y luego cruza esta compuerta.`,
      });
      return;
    }

    // Meta en (3, 4): requiere haber cruzado la compuerta de validación
    if (targetR === 3 && targetC === 4 && !unlockedGates.includes(secondVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: 'Portal de Salida Semántica',
        userAnswer: 'Intentaste salir del laberinto sin abrir la Compuerta de Lectura',
        whatWentWrong:
          'El analizador semántico debe verificar tanto las declaraciones como los usos de las variables antes de aprobar la fase.',
        whatShouldBeDone: `Pasa por 🔑 Declarar '${firstVar}' → 🔑 Declarar '${secondVar}' → 🚪 Usar '${secondVar}' y finalmente entra al Portal 🏁.`,
      });
      return;
    }

    setDronePos({ r: targetR, c: targetC });

    if (targetR === 0 && targetC === 1 && !collectedKeys.includes(firstVar)) {
      setCollectedKeys((prev) => [...prev, firstVar]);
      onStepProgress(1);
    }
    if (targetR === 1 && targetC === 2 && !collectedKeys.includes(secondVar)) {
      setCollectedKeys((prev) => [...prev, secondVar]);
      onStepProgress(2);
    }
    if (targetR === 1 && targetC === 3 && !unlockedGates.includes(secondVar)) {
      setUnlockedGates((prev) => [...prev, secondVar]);
      onStepProgress(3);
    }
    if (targetR === 3 && targetC === 4) {
      onWin();
    }
  };

  // Referencia para evitar cierres obsoletos al pulsar flechas de teclado
  const latestMazeRef = useRef({ dronePos, tryMove });
  useEffect(() => {
    latestMazeRef.current = { dronePos, tryMove };
  });

  // Escuchador de teclado: Flechas de dirección y teclas WASD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const { dronePos: dp, tryMove: tm } = latestMazeRef.current;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        tm(dp.r - 1, dp.c);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        tm(dp.r + 1, dp.c);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        tm(dp.r, dp.c - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        tm(dp.r, dp.c + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--blue-bright)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES TECLADO:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>▲</kbd> <kbd style={kbdStyle}>▼</kbd> <kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> o <kbd style={kbdStyle}>W/A/S/D</kbd> Mover Dron 🤖 por el Laberinto
          </span>
        </div>
      </div>
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(10, 20, 38, 0.92)',
          border: '1px solid var(--blue-bright)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)', fontWeight: 700 }}>
              🧭 LABERINTO DE MEMORIA (SYMBOL MAZE) — Llaves en Tabla: [{collectedKeys.join(', ') || 'ninguna'}]
            </span>
            <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: '2px 0 0 0' }}>
              Haz clic en las casillas o usa el D-Pad para guiar al dron 🤖: recoge 🔑 Declaraciones antes de abrir 🚪 Compuertas.
            </p>
          </div>

          {/* Controles D-Pad de movimiento del Dron */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r - 1, dronePos.c)}>
              ▲
            </Button>
            <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r + 1, dronePos.c)}>
              ▼
            </Button>
            <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r, dronePos.c - 1)}>
              ◀
            </Button>
            <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r, dronePos.c + 1)}>
              ▶
            </Button>
          </div>
        </div>

        {/* Cuadrícula 4x5 del Laberinto */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
          }}
        >
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => {
              const isDrone = dronePos.r === r && dronePos.c === c;
              const walls = new Set(['0,2', '1,0', '2,1', '2,3', '3,2']);
              const isWall = walls.has(`${r},${c}`);
              const isTrap1 = r === 0 && c === 3;
              const isTrap2 = r === 3 && c === 1;
              const isKey1 = r === 0 && c === 1;
              const isKey2 = r === 1 && c === 2;
              const isGate = r === 1 && c === 3;
              const isGoal = r === 3 && c === 4;

              let cellLabel = 'Pasillo';
              let icon = '·';
              if (isWall) {
                cellLabel = 'Muro';
                icon = '🧱';
              } else if (isTrap1) {
                cellLabel = 'Trampa: z_undef';
                icon = '☠️';
              } else if (isTrap2) {
                cellLabel = 'Trampa: Uso previo';
                icon = '☠️';
              } else if (isKey1) {
                cellLabel = `Declarar ${firstVar}`;
                icon = collectedKeys.includes(firstVar) ? '✅' : '🔑';
              } else if (isKey2) {
                cellLabel = `Declarar ${secondVar}`;
                icon = collectedKeys.includes(secondVar) ? '✅' : '🔑';
              } else if (isGate) {
                cellLabel = `Puerta: Usar ${secondVar}`;
                icon = unlockedGates.includes(secondVar) ? '🔓' : '🚪';
              } else if (isGoal) {
                cellLabel = 'Meta Semántica';
                icon = '🏁';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={isWall}
                  onClick={() => tryMove(r, c)}
                  style={{
                    minHeight: '64px',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isWall
                      ? 'rgba(5, 9, 18, 0.96)'
                      : isDrone
                      ? 'rgba(16, 185, 129, 0.28)'
                      : isTrap1 || isTrap2
                      ? 'rgba(244, 63, 94, 0.14)'
                      : 'rgba(19, 36, 66, 0.75)',
                    border: isDrone
                      ? '2px solid var(--green)'
                      : isTrap1 || isTrap2
                      ? '1px dashed var(--red)'
                      : '1px solid var(--line)',
                    color: '#FFFFFF',
                    cursor: isWall ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.73rem',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{isDrone ? '🤖' : icon}</span>
                  <span style={{ textAlign: 'center', lineHeight: 1.1 }}>{cellLabel}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. FASE CÓDIGO INTERMEDIO (TAC): 🎯 POST-ORDER SNIPER (Todas las Dianas en Pista)
// ============================================================================
const PostOrderSniperGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const instrs: Array<{ index: number; text: string }> = useMemo(
    () => phase.output?.instructions || [],
    [phase]
  );

  const [shotCount, setShotCount] = useState(0);
  const [focusedPlateIdx, setFocusedPlateIdx] = useState(0);

  // Mezclamos determinísticamente el orden visual de las dianas en la galería para que el jugador deba apuntar en el orden postorden real
  const galleryTargets = useMemo(() => {
    const realTargets = instrs.map((ins) => ({
      id: `tac-${ins.index}`,
      orderIndex: ins.index,
      text: ins.text,
      isDecoy: false,
    }));
    const decoy = {
      id: 'tac-decoy',
      orderIndex: -1,
      text: 't_pre = a + b (Sin evaluar precedencia *)',
      isDecoy: true,
    };
    const all = [...realTargets, decoy];
    // Rotación determinista para que no estén en orden 0,1,2... lineal
    return all.map((_, i) => all[(i * 3 + 1) % all.length]);
  }, [instrs]);

  const expectedTarget = instrs[shotCount];

  const handleShootPlate = (plate: { id: string; orderIndex: number; text: string; isDecoy: boolean }) => {
    if (!expectedTarget) return;

    if (!plate.isDecoy && plate.orderIndex === shotCount) {
      const next = shotCount + 1;
      setShotCount(next);
      onStepProgress(next);
      if (next >= instrs.length) {
        onWin();
      }
    } else if (plate.isDecoy) {
      onMistake({
        phaseName: 'Código Intermedio TAC (Post-Order Sniper)',
        stepTitle: `Disparo #${shotCount + 1} de ${instrs.length}`,
        userAnswer: `Disparaste a la diana señuelo "${plate.text}"`,
        whatWentWrong:
          'Esa diana evalúa una suma antes que la multiplicación, violando la estructura del AST generada en la fase sintáctica.',
        whatShouldBeDone: `Apunta con la mira ⊕ y derriba la diana "${expectedTarget.text}" (instrucción [${shotCount}] del recorrido en postorden).`,
      });
    } else {
      onMistake({
        phaseName: 'Código Intermedio TAC (Post-Order Sniper)',
        stepTitle: `Disparo #${shotCount + 1} de ${instrs.length}`,
        userAnswer: `Disparaste prematuramente a la diana "${plate.text}" (posición [${plate.orderIndex}])`,
        whatWentWrong: `Intentaste emitir "${plate.text}" antes de haber emitido "${expectedTarget.text}". En código de tres direcciones (TAC), las subexpresiones e inicializaciones previas deben emitirse primero.`,
        whatShouldBeDone: `Derriba primero la diana "${expectedTarget.text}" (paso [${shotCount}] en postorden).`,
      });
    }
  };

  const latestSniperRef = useRef({
    focusedPlateIdx,
    galleryTargets,
    handleShootPlate,
  });
  useEffect(() => {
    latestSniperRef.current = {
      focusedPlateIdx,
      galleryTargets,
      handleShootPlate,
    };
  });

  // Escuchador de teclado: Flechas para mover la mira y ESPACIO / ENTER para disparar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { galleryTargets: gt, focusedPlateIdx: fp, handleShootPlate: hs } = latestSniperRef.current;
      if (gt.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setFocusedPlateIdx((i) => (i - 1 + gt.length) % gt.length);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd' || e.key === 'D' || e.key === 'Tab') {
        e.preventDefault();
        setFocusedPlateIdx((i) => (i + 1) % gt.length);
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (gt[fp]) {
          hs(gt[fp]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!expectedTarget) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--blue-bright)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES TECLADO:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> <kbd style={kbdStyle}>▲</kbd> <kbd style={kbdStyle}>▼</kbd> Mover Mira Telescópica ⊕
          </span>
          <span>
            <kbd style={kbdStyle}>ESPACIO</kbd> o <kbd style={kbdStyle}>ENTER</kbd> Disparar Diana TAC
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.16), #070d19 82%)',
          border: '1px solid var(--blue-bright)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)', fontWeight: 700 }}>
            🎯 CAMPO DE TIRO POST-ORDER SNIPER — Dianas Derribadas: {shotCount} / {instrs.length}
          </span>
          <span style={{ fontSize: '0.76rem', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            Derriba todas las dianas de la galería en el orden exacto de emisión TAC (postorden)
          </span>
        </div>

        {/* Galería con todas las dianas simultáneas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '10px',
            padding: '12px',
            backgroundColor: 'rgba(6, 11, 23, 0.8)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
          }}
        >
          {galleryTargets.map((plate, pIdx) => {
            const alreadyShot = !plate.isDecoy && plate.orderIndex < shotCount;
            const isFocused = focusedPlateIdx === pIdx;
            return (
              <button
                key={plate.id}
                type="button"
                disabled={alreadyShot}
                onClick={() => {
                  setFocusedPlateIdx(pIdx);
                  handleShootPlate(plate);
                }}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: alreadyShot
                    ? 'rgba(16, 185, 129, 0.15)'
                    : isFocused
                    ? 'rgba(56, 189, 248, 0.28)'
                    : 'rgba(15, 23, 42, 0.92)',
                  border: alreadyShot
                    ? '1px solid var(--green)'
                    : isFocused
                    ? '2px solid #38BDF8'
                    : '1px solid var(--line-strong)',
                  color: alreadyShot ? 'var(--green)' : '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: alreadyShot ? 'default' : 'crosshair',
                  opacity: alreadyShot ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  boxShadow: isFocused ? '0 0 16px rgba(56, 189, 248, 0.5)' : 'none',
                }}
              >
                <span>
                  {alreadyShot ? '💥' : isFocused ? '⊕' : '🎯'} {plate.text}
                </span>
                <span style={{ fontSize: '0.75rem', color: alreadyShot ? 'var(--green)' : 'var(--blue-bright)' }}>
                  {alreadyShot ? 'EMITIDA' : isFocused ? '⊕ [ESPACIO]' : 'DISPARAR'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. FASE OPTIMIZACIÓN: 🛡️ OPTIMIZER TOWER DEFENSE (Cinta y Torretas)
// ============================================================================
const OptimizerDefenseGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const waves = [
    {
      id: 'wave-prop',
      packet: 't1 = b * 2   |   t2 = a + t1   (con a=5, b=3)',
      transformed: 't1 = 3 * 2   |   t2 = 5 + t1',
      title: 'Paquete #1 en Cinta: Variables con Constantes Conocidas',
      expectedTurret: 'PROP',
      explain:
        'Activa primero la Torreta Propagadora (Azul) para sustituir las variables por sus valores constantes conocidos (a → 5, b → 3).',
    },
    {
      id: 'wave-fold',
      packet: 't1 = 3 * 2   |   t2 = 5 + 6',
      transformed: 't1 = 6   |   t2 = 11   |   print 11',
      title: 'Paquete #2 en Cinta: Expresiones entre Constantes Puras',
      expectedTurret: 'FOLD',
      explain:
        'Dispara la Torreta Plegadora (Constant Folding) para calcular 3 * 2 = 6 y 5 + 6 = 11 en tiempo de compilación.',
    },
    {
      id: 'wave-dce',
      packet: 'a = 5, b = 3, t1 = 6, t2 = 11, c = 11 (Asignaciones sin lecturas futuras)',
      transformed: 'Sobrevive únicamente: print 11',
      title: 'Paquete #3 en Cinta: Temporales y Asignaciones Muertas',
      expectedTurret: 'DCE',
      explain:
        'Dispara el Láser Destructor DCE (Rojo) para desintegrar las instrucciones muertas antes de que consuman ciclos en la CPU.',
    },
  ];

  const [waveIdx, setWaveIdx] = useState(0);
  const currentWave = waves[waveIdx];

  const handleFireTurret = (turret: 'PROP' | 'FOLD' | 'DCE', turretName: string) => {
    if (!currentWave) return;
    if (turret === currentWave.expectedTurret) {
      const next = waveIdx + 1;
      setWaveIdx(next);
      onStepProgress(next);
      if (next >= waves.length) {
        onWin();
      }
    } else {
      onMistake({
        phaseName: 'Optimización (Optimizer Tower Defense)',
        stepTitle: currentWave.title,
        userAnswer: `Disparaste ${turretName} contra el paquete [${currentWave.packet}]`,
        whatWentWrong: `Activaste la torreta incorrecta sobre la cinta transportadora. Si destruyes código antes de propagar o intentas plegar variables sin reemplazarlas antes, corrompes el programa.`,
        whatShouldBeDone: currentWave.explain,
      });
    }
  };

  const latestDefenseRef = useRef({
    handleFireTurret,
  });
  useEffect(() => {
    latestDefenseRef.current = {
      handleFireTurret,
    };
  });

  // Escuchador de teclado: teclas 1, 2, 3 para disparar las torretas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { handleFireTurret: hf } = latestDefenseRef.current;

      if (e.key === '1') {
        e.preventDefault();
        hf('PROP', '🔵 Torreta 1: Rayo Propagador de Constantes');
      } else if (e.key === '2') {
        e.preventDefault();
        hf('FOLD', '🟢 Torreta 2: Prensa de Plegado (Constant Folding)');
      } else if (e.key === '3') {
        e.preventDefault();
        hf('DCE', '🔴 Torreta 3: Láser Destructor DCE (Código Muerto)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentWave) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES TECLADO:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>1</kbd> Torreta Propagación
          </span>
          <span>
            <kbd style={kbdStyle}>2</kbd> Prensa Plegado (Folding)
          </span>
          <span>
            <kbd style={kbdStyle}>3</kbd> Láser Destructor DCE
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(10, 20, 38, 0.92)',
          border: '1px solid var(--green)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>
            🛡️ TOWER DEFENSE DEL OPTIMIZADOR — Oleada {waveIdx + 1} de {waves.length} ({phase.summary})
          </span>
        </div>

        {/* Carril de Cinta Transportadora */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(6, 11, 23, 0.88)',
            border: '1px dashed var(--blue-bright)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--blue-bright)' }}>
              {currentWave.title}
            </span>
            <Chip label="➔ Cinta hacia 🧠 Núcleo CPU" variant="cyan" />
          </div>
          <strong style={{ color: '#FFFFFF', fontSize: '0.96rem' }}>
            📦 En cinta: {currentWave.packet}
          </strong>
        </div>

        {/* 3 Torretas Defensivas sobre la Cinta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => handleFireTurret('PROP', '🔵 Torreta 1: Rayo Propagador de Constantes')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              border: '2px solid var(--blue-bright)',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>🔵 Torreta 1: Rayo Propagador</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>[Pulsa Tecla 1 o Clic]</span>
          </button>

          <button
            type="button"
            onClick={() => handleFireTurret('FOLD', '🟢 Torreta 2: Prensa de Plegado (Constant Folding)')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid var(--green)',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>🟢 Torreta 2: Prensa Folding</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>[Pulsa Tecla 2 o Clic]</span>
          </button>

          <button
            type="button"
            onClick={() => handleFireTurret('DCE', '🔴 Torreta 3: Láser Destructor DCE (Código Muerto)')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.18)',
              border: '2px solid var(--red)',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>🔴 Torreta 3: Láser DCE</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>[Pulsa Tecla 3 o Clic]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. FASE ENSAMBLADOR: ⚡ REGISTER SWITCHBOARD (Conectar Chips R0-R7 y Compuertas)
// ============================================================================
const ISA_OPCODES = ['LOADI', 'LOAD', 'STORE', 'ADD', 'SUB', 'MUL', 'NEG', 'PRINT', 'HALT'];

const RegisterSwitchboardGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const instrs: Array<{ pc: number; text: string }> = useMemo(
    () => phase.output?.instructions || [],
    [phase]
  );

  const [pcIdx, setPcIdx] = useState(0);
  const [focusedOpcodeIdx, setFocusedOpcodeIdx] = useState(0);
  const currentIns = instrs[pcIdx];

  const expectedOpcode = useMemo(() => {
    if (!currentIns) return 'HALT';
    return currentIns.text.split(' ')[0];
  }, [currentIns]);

  const expectedReg = useMemo(() => {
    if (!currentIns) return null;
    const match = currentIns.text.match(/R([0-7])/);
    return match ? parseInt(match[1], 10) : null;
  }, [currentIns]);

  const [selectedReg, setSelectedReg] = useState<number | null>(0);

  useEffect(() => {
    setSelectedReg(expectedReg);
  }, [expectedReg]);

  const handleActivateOpcodeGate = (opcodeClicked: string) => {
    if (!currentIns) return;

    if (opcodeClicked !== expectedOpcode) {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Ciclo de Reloj PC=${currentIns.pc} (Objetivo: ${currentIns.text})`,
        userAnswer: `Activaste la compuerta lógica [${opcodeClicked}]`,
        whatWentWrong:
          opcodeClicked === 'LOAD' && expectedOpcode === 'LOADI'
            ? 'Activaste LOAD (lectura de celda de memoria RAM) cuando necesitabas cargar un número constante inmediato con LOADI.'
            : `La compuerta [${opcodeClicked}] no corresponde a la instrucción de máquina requerida en PC=${currentIns.pc} (${currentIns.text}).`,
        whatShouldBeDone: `Conecta el registro ${expectedReg !== null ? `R${expectedReg}` : 'del sistema'} y pulsa la compuerta [${expectedOpcode}] para emitir "${currentIns.text}".`,
      });
      return;
    }

    if (expectedReg !== null && selectedReg !== expectedReg) {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Asignación de Registro en PC=${currentIns.pc}`,
        userAnswer: `Conectaste el cable al chip R${selectedReg ?? 'ninguno'} en vez de R${expectedReg}`,
        whatWentWrong: `Para la instrucción "${currentIns.text}", el asignador de registros seleccionó R${expectedReg}, pero tu cable apunta a R${selectedReg}.`,
        whatShouldBeDone: `Haz clic primero en el chip [🔌 R${expectedReg}] del banco de registros y luego acciona la compuerta [${expectedOpcode}].`,
      });
      return;
    }

    const next = pcIdx + 1;
    setPcIdx(next);
    onStepProgress(next);
    if (next >= instrs.length) {
      onWin();
    }
  };

  const latestSwitchboardRef = useRef({
    selectedReg,
    focusedOpcodeIdx,
    handleActivateOpcodeGate,
  });
  useEffect(() => {
    latestSwitchboardRef.current = {
      selectedReg,
      focusedOpcodeIdx,
      handleActivateOpcodeGate,
    };
  });

  // Escuchador de teclado: Flechas ◀ / ▶ o teclas 0-7 para registros, ▲ / ▼ para opcode y ESPACIO / ENTER para emitir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { focusedOpcodeIdx: fo, handleActivateOpcodeGate: ha } = latestSwitchboardRef.current;

      if (['0', '1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        e.preventDefault();
        setSelectedReg(parseInt(e.key, 10));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setSelectedReg((r) => ((r ?? 0) - 1 + 8) % 8);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setSelectedReg((r) => ((r ?? 0) + 1) % 8);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setFocusedOpcodeIdx((i) => (i - 1 + ISA_OPCODES.length) % ISA_OPCODES.length);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'Tab') {
        e.preventDefault();
        setFocusedOpcodeIdx((i) => (i + 1) % ISA_OPCODES.length);
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        ha(ISA_OPCODES[fo]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentIns) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Barra HUD de controles interactivos con el teclado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: 'var(--blue-bright)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          🎮 CONTROLES TECLADO:
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> o <kbd style={kbdStyle}>0-7</kbd> Cablear Chip R0–R7
          </span>
          <span>
            <kbd style={kbdStyle}>▲</kbd> <kbd style={kbdStyle}>▼</kbd> Seleccionar Opcode
          </span>
          <span>
            <kbd style={kbdStyle}>ESPACIO</kbd> o <kbd style={kbdStyle}>ENTER</kbd> Emitir Ciclo
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(10, 20, 38, 0.92)',
          border: '1px solid var(--blue-bright)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)', fontWeight: 700 }}>
            ⚡ TABLERO ELECTRÓNICO DE REGISTROS (R0–R7) — Ciclo PC={currentIns.pc}: Armar [{currentIns.text}]
          </span>
          <span style={{ fontSize: '0.76rem', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            1° Conecta el Chip R0–R7 &bull; 2° Pulsa la Compuerta Opcode ISA
          </span>
        </div>

        {/* Banco interactivo de los 8 chips de registros R0..R7 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, minmax(56px, 1fr))',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
            const isWired = selectedReg === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReg(r)}
                style={{
                  padding: '10px 6px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  backgroundColor: isWired ? 'rgba(16, 185, 129, 0.28)' : 'rgba(15, 23, 42, 0.75)',
                  border: isWired ? '2px solid var(--green)' : '1px solid var(--line)',
                  color: isWired ? '#FFFFFF' : 'var(--muted)',
                  cursor: 'pointer',
                  boxShadow: isWired ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                🔌 R{r}
              </button>
            );
          })}
        </div>

        {/* Panel de las 9 Compuertas de Opcode ISA */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '8px',
          }}
        >
          {ISA_OPCODES.map((op, oIdx) => {
            const isTarget = op === expectedOpcode;
            const isFocused = focusedOpcodeIdx === oIdx;
            return (
              <button
                key={op}
                type="button"
                onClick={() => {
                  setFocusedOpcodeIdx(oIdx);
                  handleActivateOpcodeGate(op);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isFocused
                    ? 'rgba(56, 189, 248, 0.35)'
                    : isTarget
                    ? 'rgba(37, 99, 235, 0.25)'
                    : 'rgba(15, 23, 42, 0.85)',
                  border: isFocused
                    ? '2px solid #38BDF8'
                    : isTarget
                    ? '2px solid var(--blue-bright)'
                    : '1px solid var(--line-strong)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: isFocused ? '0 0 14px rgba(56, 189, 248, 0.5)' : 'none',
                }}
              >
                ⚡ {op} {isFocused ? '◀' : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONTENEDOR PRINCIPAL DE LOS 6 MINI-JUEGOS ARCADE (Fases 1 a 6)
// ============================================================================
export const PhaseMiniGame: React.FC<PhaseMiniGameProps> = ({
  phase,
  onCompletePhase,
  onSyncStepIndex,
}) => {
  const [phaseCompleted, setPhaseCompleted] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [stepsDone, setStepsDone] = useState(0);
  const [feedbackModal, setFeedbackModal] = useState<GameMistakeFeedback | null>(null);

  useEffect(() => {
    setPhaseCompleted(false);
    setMistakesCount(0);
    setStepsDone(0);
    setFeedbackModal(null);
  }, [phase.id]);

  // La fase 7 (binary) NO lleva mini-juego
  if (phase.id === 'binary') {
    return null;
  }

  const handleMistake = (fb: GameMistakeFeedback) => {
    setMistakesCount((m) => m + 1);
    setFeedbackModal(fb);
  };

  const handleStepProgress = (idx: number) => {
    setStepsDone(idx);
    if (onSyncStepIndex && phase.steps.length > 0) {
      onSyncStepIndex(Math.min(phase.steps.length - 1, idx));
    }
  };

  return (
    <div
      role="region"
      aria-label={`Mini-juego arcade de ${phase.name}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '18px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(37, 99, 235, 0.12))',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Chip label="🕹️ MODO ARCADE HERO" variant="green" />
          <strong style={{ color: 'var(--text-pure)', fontSize: '1rem' }}>
            {phase.name}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--blue-bright)',
              padding: '4px 10px',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              borderRadius: '999px',
            }}
          >
            Progreso: {stepsDone}
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: mistakesCount === 0 ? 'var(--green)' : 'var(--amber)',
              padding: '4px 10px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '999px',
            }}
          >
            Fallos: {mistakesCount}
          </span>
        </div>
      </div>

      {!phaseCompleted ? (
        <>
          {phase.id === 'lexical' && (
            <SpaceLexerGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
          {phase.id === 'syntactic' && (
            <AstConstellationGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
          {phase.id === 'semantic' && (
            <SymbolMazeGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
          {phase.id === 'ir' && (
            <PostOrderSniperGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
          {phase.id === 'optimization' && (
            <OptimizerDefenseGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
          {phase.id === 'assembly' && (
            <RegisterSwitchboardGame
              phase={phase}
              onWin={() => setPhaseCompleted(true)}
              onMistake={handleMistake}
              onStepProgress={handleStepProgress}
            />
          )}
        </>
      ) : (
        <div
          style={{
            padding: '18px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--green)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              🏆 ¡Misión Arcade de {phase.name} Superada!
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: '4px 0 0 0' }}>
              Completaste todos los procesos internos del compilador en esta fase ({mistakesCount} fallos).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => setPhaseCompleted(false)}>
              Jugar de nuevo
            </Button>
            {onCompletePhase && (
              <Button variant="primary" size="sm" onClick={onCompletePhase}>
                Avanzar a la Siguiente Fase →
              </Button>
            )}
          </div>
        </div>
      )}

      <ErrorFeedbackModal
        feedback={feedbackModal}
        onClose={() => setFeedbackModal(null)}
      />
    </div>
  );
};
