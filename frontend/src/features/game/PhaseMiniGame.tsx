import React, { useEffect, useMemo, useState } from 'react';
import { PhaseResult } from '../../api/schema';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ErrorFeedbackModal, GameMistakeFeedback } from './ErrorFeedbackModal';

interface PhaseMiniGameProps {
  phase: PhaseResult;
  onCompletePhase?: () => void;
  onSyncStepIndex?: (stepIdx: number) => void;
}

// ============================================================================
// 1. FASE LÉXICA: 🚀 SPACE LEXER (Juego de Navecitas y Disparos Láser)
// ============================================================================
type LaserCannonType = 'ID' | 'NUM' | 'OP' | 'RES';

interface CannonDef {
  id: LaserCannonType;
  name: string;
  keyHint: string;
  color: string;
  desc: string;
}

const CANNONS: CannonDef[] = [
  {
    id: 'ID',
    name: '⚡ Cañón ID (Identificador de variable)',
    keyHint: '[1]',
    color: '#38BDF8',
    desc: 'Variables como a, b, c, x',
  },
  {
    id: 'NUM',
    name: '🟣 Cañón NUM (Constante numérica entera)',
    keyHint: '[2]',
    color: '#818CF8',
    desc: 'Números enteros como 5, 3, 2',
  },
  {
    id: 'OP',
    name: '🟠 Cañón OPERADOR (=, +, -, *, paréntesis)',
    keyHint: '[3]',
    color: '#F59E0B',
    desc: 'Símbolos =, +, -, *, (, )',
  },
  {
    id: 'RES',
    name: '🟢 Cañón RESERVADO (print / salto de línea)',
    keyHint: '[4]',
    color: '#10B981',
    desc: 'Palabra reservada print y fin de línea',
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
  const [shipLane, setShipLane] = useState(1);
  const [laserShotAnim, setLaserShotAnim] = useState<number | null>(null);
  const [destroyedTokens, setDestroyedTokens] = useState<string[]>([]);

  const activeToken = tokens[currentIdx];
  const targetLane = currentIdx % 4;

  useEffect(() => {
    setShipLane(targetLane);
  }, [targetLane]);

  const handleFireAtMeteor = (cannonToUse: LaserCannonType, laneClicked?: number) => {
    if (!activeToken) return;
    if (laneClicked !== undefined) setShipLane(laneClicked);

    const expectedCannon = mapTokenToCannon(activeToken.type);
    const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n' : activeToken.lexeme;

    if (cannonToUse === expectedCannon) {
      setLaserShotAnim(targetLane);
      setTimeout(() => setLaserShotAnim(null), 220);

      const nextList = [...destroyedTokens, `${lexDisplay}:${activeToken.type}`];
      setDestroyedTokens(nextList);
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      onStepProgress(nextIdx);
      if (nextIdx >= tokens.length) {
        onWin();
      }
    } else {
      const chosenDef = CANNONS.find((c) => c.id === cannonToUse)!;
      const rightDef = CANNONS.find((c) => c.id === expectedCannon)!;
      onMistake({
        phaseName: 'Análisis Léxico (Space Lexer)',
        stepTitle: `Meteorito #${currentIdx + 1}: "${lexDisplay}" (Línea ${activeToken.line}, Col ${activeToken.col})`,
        userAnswer: `Disparaste con ${chosenDef.name}`,
        whatWentWrong: `El rayo rebotó en el escudo del meteorito "${lexDisplay}" porque no pertenece a la categoría ${chosenDef.id} (${chosenDef.desc}).`,
        whatShouldBeDone: `Para desintegrar el lexema "${lexDisplay}" (token ${activeToken.type}), debes sintonizar tu nave con ${rightDef.name} y disparar.`,
      });
    }
  };

  if (!activeToken) return null;

  const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n (Fin línea)' : `"${activeToken.lexeme}"`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Radar espacial con meteoritos y nave */}
      <div
        style={{
          position: 'relative',
          minHeight: '270px',
          borderRadius: 'var(--radius-md)',
          background:
            'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.28), rgba(6, 11, 25, 0.96) 75%)',
          border: '1px solid var(--blue-bright)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Barra de estado del escuadrón espacial */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)' }}>
            🚀 MISIÓN SPACE LEXER — Meteorito {currentIdx + 1} de {tokens.length}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            1° Elige el Cañón Láser abajo &bull; 2° Dispara al Meteorito
          </span>
        </div>

        {/* 4 Carriles Espaciales con el Meteorito Activo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            margin: '18px 0',
            alignItems: 'center',
          }}
        >
          {[0, 1, 2, 3].map((lane) => {
            const hasMeteor = lane === targetLane;
            const isShipHere = lane === shipLane;

            return (
              <div
                key={lane}
                onClick={() => {
                  setShipLane(lane);
                  if (hasMeteor) handleFireAtMeteor(selectedCannon, lane);
                }}
                style={{
                  minHeight: '145px',
                  borderRadius: 'var(--radius-sm)',
                  border: hasMeteor
                    ? '1px dashed rgba(56, 189, 248, 0.6)'
                    : '1px dashed rgba(255, 255, 255, 0.08)',
                  backgroundColor: hasMeteor ? 'rgba(37, 99, 235, 0.12)' : 'rgba(15, 23, 42, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px',
                  cursor: hasMeteor ? 'crosshair' : 'pointer',
                  position: 'relative',
                }}
              >
                {/* Meteorito en este carril */}
                {hasMeteor ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFireAtMeteor(selectedCannon, lane);
                    }}
                    aria-label={`Disparar al meteorito ${lexDisplay}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #1E293B, #0F172A)',
                      border: '2px solid var(--blue-bright)',
                      boxShadow: '0 0 18px rgba(56, 189, 248, 0.45)',
                      color: '#FFFFFF',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      cursor: 'crosshair',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>☄️</span>
                    <span>{lexDisplay}</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>∙ ∙ ∙</span>
                )}

                {/* Rayo láser animado */}
                {isShipHere && (
                  <div
                    style={{
                      width: '4px',
                      height: '38px',
                      borderRadius: '2px',
                      backgroundColor:
                        CANNONS.find((c) => c.id === selectedCannon)?.color || '#38BDF8',
                      boxShadow: `0 0 12px ${
                        CANNONS.find((c) => c.id === selectedCannon)?.color || '#38BDF8'
                      }`,
                      opacity: laserShotAnim === lane ? 1 : 0.45,
                    }}
                  />
                )}

                {/* Nave espacial en la base del carril */}
                <div
                  style={{
                    fontSize: isShipHere ? '1.65rem' : '1.1rem',
                    opacity: isShipHere ? 1 : 0.3,
                    transform: isShipHere ? 'scale(1.1)' : 'scale(0.9)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isShipHere ? '🛸' : '▲'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón grande de Disparo Directo */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="primary"
            onClick={() => handleFireAtMeteor(selectedCannon, targetLane)}
          >
            🔫 Disparar {CANNONS.find((c) => c.id === selectedCannon)?.id} contra Meteorito {lexDisplay}
          </Button>
        </div>
      </div>

      {/* Selector de los 4 Cañones Láser de la Nave (permite también disparar directo al hacer clic) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '10px',
        }}
      >
        {CANNONS.map((cannon) => {
          const isSelected = selectedCannon === cannon.id;
          return (
            <button
              key={cannon.id}
              type="button"
              onClick={() => {
                setSelectedCannon(cannon.id);
                handleFireAtMeteor(cannon.id, targetLane);
              }}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isSelected
                  ? 'rgba(37, 99, 235, 0.25)'
                  : 'rgba(15, 23, 42, 0.85)',
                border: `2px solid ${isSelected ? cannon.color : 'var(--line)'}`,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <strong style={{ fontSize: '0.86rem', color: cannon.color }}>
                {cannon.name}
              </strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                {cannon.desc} (Clic para equipar y disparar)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 2. FASE SINTÁCTICA: 🕸️ AST CONSTELLATION (Conectar Puntos y Nodos Estelares)
// ============================================================================
interface StarLink {
  id: string;
  parentLabel: string;
  childLabel: string;
  ruleExplain: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const AstConstellationGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const links: StarLink[] = useMemo(() => {
    const stmts: any[] = phase.output?.ast?.statements || [];
    const result: StarLink[] = [];

    stmts.forEach((stmt, idx) => {
      const isAssign = stmt.kind === 'Assign';
      const parentName = isAssign ? `Assign(${stmt.name} =)` : `Print(print)`;
      const expr = stmt.expr;

      if (expr?.kind === 'BinOp') {
        // Si tiene subexpresión derecha binaria (ej. a + b * 2), primero se debe conectar la de mayor precedencia (*)
        if (expr.right?.kind === 'BinOp') {
          const innerOp = expr.right.op;
          const rLeft = expr.right.left?.name ?? expr.right.left?.value ?? 'izq';
          const rRight = expr.right.right?.name ?? expr.right.right?.value ?? 'der';
          result.push({
            id: `link-inner-${idx}`,
            parentLabel: `Nodo '${innerOp}' ( Línea ${idx + 1} )`,
            childLabel: `Hijos (${rLeft}, ${rRight})`,
            ruleExplain: `Por precedencia de operadores, '${innerOp}' (nivel term) debe conectar primero a sus operandos (${rLeft} y ${rRight}) antes de unirse a '${expr.op}'.`,
            x1: 68,
            y1: 55,
            x2: 80,
            y2: 85,
          });
        }

        const leftLabel = expr.left?.name ?? expr.left?.value ?? 'expr_izq';
        const rightLabel =
          expr.right?.kind === 'BinOp'
            ? `Subárbol (${expr.right.op})`
            : expr.right?.name ?? expr.right?.value ?? 'expr_der';

        result.push({
          id: `link-bin-${idx}`,
          parentLabel: `Nodo '${expr.op}' ( Línea ${idx + 1} )`,
          childLabel: `Operandos (${leftLabel} y ${rightLabel})`,
          ruleExplain: `El operador '${expr.op}' enlaza como padre a '${leftLabel}' por la izquierda y a '${rightLabel}' por la derecha.`,
          x1: 50,
          y1: 35,
          x2: 68,
          y2: 55,
        });

        result.push({
          id: `link-stmt-${idx}`,
          parentLabel: `${parentName} [Línea ${idx + 1}]`,
          childLabel: `Raíz de expresión '${expr.op}'`,
          ruleExplain: `La sentencia ${parentName} conecta su ranura de expresión con el nodo raíz '${expr.op}'.`,
          x1: 30,
          y1: 18,
          x2: 50,
          y2: 35,
        });
      } else {
        const valLabel =
          expr?.kind === 'Neg'
            ? `Neg(-${expr.operand?.name ?? expr.operand?.value ?? 'x'})`
            : expr?.name ?? expr?.value ?? 'valor';
        result.push({
          id: `link-simple-${idx}`,
          parentLabel: `${parentName} [Línea ${idx + 1}]`,
          childLabel: `Operando '${valLabel}'`,
          ruleExplain: `En la línea ${idx + 1}, el nodo de sentencia ${parentName} se conecta directamente con su hijo '${valLabel}'.`,
          x1: 25 + (idx * 18) % 50,
          y1: 22,
          x2: 35 + (idx * 18) % 50,
          y2: 72,
        });
      }
    });

    return result;
  }, [phase]);

  const [connectedCount, setConnectedCount] = useState(0);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  const currentLink = links[connectedCount];

  const handleConnectAttempt = (targetChoice: 'correct' | 'invert-hierarchy' | 'skip-precedence') => {
    if (!currentLink) return;

    if (targetChoice === 'correct') {
      const next = connectedCount + 1;
      setConnectedCount(next);
      setSelectedOrigin(null);
      onStepProgress(next);
      if (next >= links.length) {
        onWin();
      }
    } else if (targetChoice === 'invert-hierarchy') {
      onMistake({
        phaseName: 'Análisis Sintáctico (AST Constellation)',
        stepTitle: `Conexión Estelar #${connectedCount + 1}`,
        userAnswer: `Intentaste conectar los operandos hojas como padres de ${currentLink.parentLabel}`,
        whatWentWrong:
          'Cortocircuito en el AST: colocaste un literal/variable como nodo padre de un operador o sentencia. Las hojas no pueden tener hijos en el árbol sintáctico.',
        whatShouldBeDone: currentLink.ruleExplain,
      });
    } else {
      onMistake({
        phaseName: 'Análisis Sintáctico (AST Constellation)',
        stepTitle: `Conexión Estelar #${connectedCount + 1}`,
        userAnswer: 'Intentaste saltar la precedencia conectando directamente la raíz sin agrupar el subárbol',
        whatWentWrong:
          'Rompiste el orden de precedencia gramatical (term vs expr). Si conectas el operador de menor precedencia primero, el árbol evaluaría la operación equivocada.',
        whatShouldBeDone: currentLink.ruleExplain,
      });
    }
  };

  if (!currentLink) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Mapa Estelar SVG de Conectar Puntos */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.16), #070d19 80%)',
          border: '1px solid var(--green)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
            🕸️ CONSTELACIÓN AST — Enlace {connectedCount + 1} de {links.length}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Haz clic en el Nodo Padre y luego conecta el cable con su Nodo Hijo
          </span>
        </div>

        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '180px',
            backgroundColor: 'rgba(6, 11, 23, 0.75)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
          }}
        >
          {/* Cables ya conectados */}
          {links.slice(0, connectedCount).map((lnk) => (
            <g key={lnk.id}>
              <line
                x1={lnk.x1}
                y1={lnk.y1}
                x2={lnk.x2}
                y2={lnk.y2}
                stroke="#10B981"
                strokeWidth="1.6"
              />
              <circle cx={lnk.x1} cy={lnk.y1} r="3.5" fill="#10B981" />
              <circle cx={lnk.x2} cy={lnk.y2} r="3.5" fill="#38BDF8" />
            </g>
          ))}

          {/* Cable guía punteado del enlace actual */}
          <line
            x1={currentLink.x1}
            y1={currentLink.y1}
            x2={currentLink.x2}
            y2={currentLink.y2}
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeDasharray="2.5 2.5"
          />

          {/* Punto Padre Activo */}
          <circle
            cx={currentLink.x1}
            cy={currentLink.y1}
            r="5.5"
            fill={selectedOrigin ? '#10B981' : '#2563EB'}
            stroke="#FFFFFF"
            strokeWidth="1"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedOrigin(currentLink.parentLabel)}
          />
          <text
            x={currentLink.x1}
            y={Math.max(10, currentLink.y1 - 8)}
            fill="#FFFFFF"
            fontSize="4.2"
            textAnchor="middle"
            fontFamily="monospace"
          >
            PADRE: {currentLink.parentLabel}
          </text>

          {/* Punto Hijo Destino */}
          <circle
            cx={currentLink.x2}
            cy={currentLink.y2}
            r="5.5"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="1"
            style={{ cursor: 'pointer' }}
            onClick={() => handleConnectAttempt('correct')}
          />
          <text
            x={currentLink.x2}
            y={Math.min(96, currentLink.y2 + 11)}
            fill="#34D399"
            fontSize="4.2"
            textAnchor="middle"
            fontFamily="monospace"
          >
            HIJO: {currentLink.childLabel}
          </text>
        </svg>

        {/* Controles de Conexión de Nodos */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => handleConnectAttempt('correct')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid var(--green)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🔌 Conectar Padre [{currentLink.parentLabel}] ➔ Hijo [{currentLink.childLabel}]
          </button>

          <button
            type="button"
            onClick={() => handleConnectAttempt('invert-hierarchy')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--line-strong)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🔌 Conectar al revés: Hijo [{currentLink.childLabel}] como padre de [{currentLink.parentLabel}]
          </button>

          <button
            type="button"
            onClick={() => handleConnectAttempt('skip-precedence')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--line-strong)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🔌 Romper precedencia: Enlazar operandos sin respetar jerarquía EBNF
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FASE SEMÁNTICA: 🧭 SYMBOL MAZE (Laberinto 2D del Guardián de Memoria)
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

  // Construimos una ruta en laberinto 5x5 donde el dron debe recoger primero las llaves de declaración y luego abrir las puertas de uso
  const [dronePos, setDronePos] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [collectedKeys, setCollectedKeys] = useState<string[]>([]);
  const [unlockedGates, setUnlockedGates] = useState<string[]>([]);

  const firstVar = symbols[0]?.name || 'a';
  const secondVar = symbols[1]?.name || firstVar;

  // Mapa 5x5:
  // (0,0) Inicio -> (0,1) Llave 1 -> (0,2) Pared -> (0,3) Trampa E-301
  // (1,1) Pasillo -> (1,2) Llave 2 -> (1,3) Puerta Uso 1 -> (1,4) Meta
  const moveDroneTo = (r: number, c: number) => {
    if (r < 0 || r > 2 || c < 0 || c > 4) return;

    // Paredes del laberinto
    if ((r === 0 && c === 2) || (r === 2 && c === 1) || (r === 2 && c === 3)) {
      return;
    }

    // Trampa de variable no declarada en (0, 3) o (2, 2)
    if (r === 0 && c === 3) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: 'Casilla de Trampa: Variable Fantasma No Declarada (E-301)',
        userAnswer: 'Entraste al sector de memoria de una variable sin declaración previa',
        whatWentWrong:
          'Intentaste leer una dirección de memoria que no existe en la Tabla de Símbolos, disparando el error semántico E-301.',
        whatShouldBeDone: `Recorre el camino seguro del laberinto recogiendo primero las llaves de declaración (🔑 ${firstVar}, 🔑 ${secondVar}) antes de cruzar las compuertas de lectura.`,
      });
      return;
    }

    // Compuerta de lectura en (1, 3): exige haber recogido las llaves primero
    if (r === 1 && c === 3 && !collectedKeys.includes(secondVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: `Compuerta de Lectura de '${secondVar}'`,
        userAnswer: `Intentaste cruzar la puerta 'Usar ${secondVar}' sin tener la llave 'Declarar ${secondVar}'`,
        whatWentWrong: `En MiniArit no puedes usar la variable '${secondVar}' en una expresión si todavía no ha sido registrada en la Tabla de Símbolos.`,
        whatShouldBeDone: `Pasa primero por la casilla 🔑 Declarar '${secondVar}' para registrarla en la Tabla de Símbolos y luego cruza esta compuerta.`,
      });
      return;
    }

    // Meta en (1, 4): exige haber abierto la compuerta de lectura
    if (r === 1 && c === 4 && !unlockedGates.includes(firstVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze)',
        stepTitle: 'Portal de Salida Semántica',
        userAnswer: 'Intentaste salir del laberinto sin verificar las lecturas de variables',
        whatWentWrong:
          'El analizador semántico no puede dar por terminado el programa sin antes declarar y verificar todas las variables en la Tabla de Símbolos.',
        whatShouldBeDone: `Recoge primero 🔑 Declarar '${firstVar}', luego 🔑 Declarar '${secondVar}', cruza 🚪 Usar '${firstVar}' y finalmente entra al Portal 🏁.`,
      });
      return;
    }

    setDronePos({ r, c });

    if (r === 0 && c === 1 && !collectedKeys.includes(firstVar)) {
      const next = [...collectedKeys, firstVar];
      setCollectedKeys(next);
      onStepProgress(1);
    }
    if (r === 1 && c === 2 && !collectedKeys.includes(secondVar)) {
      const next = [...collectedKeys, secondVar];
      setCollectedKeys(next);
      onStepProgress(2);
    }
    if (r === 1 && c === 3 && !unlockedGates.includes(firstVar)) {
      setUnlockedGates([...unlockedGates, firstVar]);
      onStepProgress(3);
    }
    if (r === 1 && c === 4) {
      onWin();
    }
  };

  // Paso automático guiado para avanzar un paso del laberinto con 1 clic
  const handleAutoStep = () => {
    if (!collectedKeys.includes(firstVar)) {
      moveDroneTo(0, 1);
    } else if (!collectedKeys.includes(secondVar)) {
      moveDroneTo(1, 2);
    } else if (!unlockedGates.includes(firstVar)) {
      moveDroneTo(1, 3);
    } else {
      moveDroneTo(1, 4);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(10, 20, 38, 0.9)',
          border: '1px solid var(--blue-bright)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)' }}>
            🧭 LABERINTO DE MEMORIA (SYMBOL MAZE) — Llaves en Tabla: [{collectedKeys.join(', ') || 'ninguna'}]
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handleAutoStep}>
              🤖 Avanzar Dron por Ruta Válida
            </Button>
          </div>
        </div>

        {/* Cuadrícula 3x5 del Laberinto */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
          }}
        >
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3, 4].map((c) => {
              const isDrone = dronePos.r === r && dronePos.c === c;
              const isWall = (r === 0 && c === 2) || (r === 2 && c === 1) || (r === 2 && c === 3);
              const isTrap = r === 0 && c === 3;
              const isKey1 = r === 0 && c === 1;
              const isKey2 = r === 1 && c === 2;
              const isGate = r === 1 && c === 3;
              const isGoal = r === 1 && c === 4;

              let cellLabel = 'Pasillo';
              let icon = '·';
              if (isWall) {
                cellLabel = 'Muro';
                icon = '🧱';
              } else if (isTrap) {
                cellLabel = 'Trampa E-301 (Usar var sin declarar)';
                icon = '☠️';
              } else if (isKey1) {
                cellLabel = `Declarar ${firstVar}`;
                icon = collectedKeys.includes(firstVar) ? '✅' : '🔑';
              } else if (isKey2) {
                cellLabel = `Declarar ${secondVar}`;
                icon = collectedKeys.includes(secondVar) ? '✅' : '🔑';
              } else if (isGate) {
                cellLabel = `Puerta: Usar ${secondVar}`;
                icon = unlockedGates.includes(firstVar) ? '🔓' : '🚪';
              } else if (isGoal) {
                cellLabel = 'Salida Semántica';
                icon = '🏁';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={isWall}
                  onClick={() => moveDroneTo(r, c)}
                  style={{
                    minHeight: '68px',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isWall
                      ? 'rgba(5, 10, 20, 0.95)'
                      : isDrone
                      ? 'rgba(16, 185, 129, 0.28)'
                      : isTrap
                      ? 'rgba(244, 63, 94, 0.14)'
                      : 'rgba(19, 36, 66, 0.75)',
                    border: isDrone
                      ? '2px solid var(--green)'
                      : isTrap
                      ? '1px dashed var(--red)'
                      : '1px solid var(--line)',
                    color: '#FFFFFF',
                    cursor: isWall ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{isDrone ? '🤖' : icon}</span>
                  <span style={{ textAlign: 'center', lineHeight: 1.15 }}>{cellLabel}</span>
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
// 4. FASE CÓDIGO INTERMEDIO (TAC): 🎯 POST-ORDER SNIPER (Tiro al Blanco)
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

  const [shotIndex, setShotIndex] = useState(0);

  const currentTarget = instrs[shotIndex];
  const prematureTarget =
    shotIndex + 1 < instrs.length
      ? instrs[shotIndex + 1].text
      : 'print t99 (temporal aún no calculado)';

  const handleShoot = (isCorrectTarget: boolean, labelShot: string) => {
    if (!currentTarget) return;
    if (isCorrectTarget) {
      const next = shotIndex + 1;
      setShotIndex(next);
      onStepProgress(next);
      if (next >= instrs.length) {
        onWin();
      }
    } else {
      onMistake({
        phaseName: 'Código Intermedio TAC (Post-Order Sniper)',
        stepTitle: `Diana en Postorden #${shotIndex + 1} de ${instrs.length}`,
        userAnswer: `Disparaste con la mira telescópica a: "${labelShot}"`,
        whatWentWrong: `Disparaste fuera de orden. En generación de código de tres direcciones (TAC), no puedes emitir "${labelShot}" antes de haber emitido "${currentTarget.text}".`,
        whatShouldBeDone: `Apunta y dispara primero a la diana [${shotIndex}] "${currentTarget.text}" siguiendo el recorrido en postorden del AST.`,
      });
    }
  };

  if (!currentTarget) return null;

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.16), #070d19 80%)',
        border: '1px solid var(--blue-bright)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)' }}>
          🎯 CAMPO DE TIRO POST-ORDER SNIPER — Diana {shotIndex + 1} de {instrs.length}
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
          Apunta con la mira ⊕ a la instrucción TAC que toca emitir en postorden
        </span>
      </div>

      {/* Carriles de Dianas Móviles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '12px',
          padding: '12px',
          backgroundColor: 'rgba(6, 11, 23, 0.75)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          onClick={() => handleShoot(true, currentTarget.text)}
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(15, 23, 42, 0.9))',
            border: '2px solid var(--green)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'crosshair',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>🎯 Diana: {currentTarget.text}</span>
          <span style={{ color: 'var(--green)' }}>⊕ DISPARAR</span>
        </button>

        <button
          type="button"
          onClick={() => handleShoot(false, prematureTarget)}
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '2px dashed var(--amber)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'crosshair',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>🎯 Diana Señuelo (Preorden): {prematureTarget}</span>
          <span style={{ color: 'var(--amber)' }}>⊕ DISPARAR</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 5. FASE OPTIMIZACIÓN: 🛡️ OPTIMIZER TOWER DEFENSE (Defensa en Cinta)
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
      title: 'Oleada 1 en la Cinta: Variables con Constantes Conocidas (a = 5, b = 3)',
      expectedTurret: 'PROP',
      explain:
        'Primero debes activar la Torreta Propagadora (Azul) para sustituir las variables por sus valores constantes conocidos en las expresiones.',
    },
    {
      id: 'wave-fold',
      title: 'Oleada 2 en la Cinta: Operaciones entre Constantes (3 * 2 y 5 + 6)',
      expectedTurret: 'FOLD',
      explain:
        'Una vez propagadas las constantes, debes disparar la Torreta Plegadora (Constant Folding) para precalcular 3 * 2 = 6 y 5 + 6 = 11.',
    },
    {
      id: 'wave-dce',
      title: 'Oleada 3 en la Cinta: Asignaciones Muertas que ya no se vuelven a leer',
      expectedTurret: 'DCE',
      explain:
        'Finalmente, la Torreta Destructora DCE (Roja) desintegra el código muerto para que solo las instrucciones vivas lleguen al núcleo de la CPU.',
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
        userAnswer: `Activaste ${turretName}`,
        whatWentWrong: `Activaste la torreta equivocada para la oleada actual en la cinta transportadora. Si destruyes código antes de propagar o intentas plegar variables sin reemplazarlas antes, corrompes la optimización.`,
        whatShouldBeDone: currentWave.explain,
      });
    }
  };

  if (!currentWave) return null;

  return (
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
        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
          🛡️ TOWER DEFENSE DEL OPTIMIZADOR — Oleada {waveIdx + 1} de {waves.length} ({phase.summary})
        </span>
      </div>

      {/* Cinta transportadora hacia el núcleo de la CPU */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(6, 11, 23, 0.85)',
          border: '1px dashed var(--blue-bright)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
          📦 {currentWave.title}
        </span>
        <Chip label="➔ Avanzando hacia 🧠 Núcleo CPU" variant="cyan" />
      </div>

      {/* Las 3 Torretas Defensivas */}
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
          }}
        >
          🔵 Torreta 1: Rayo Propagador (Sustituir variables por constantes)
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
          }}
        >
          🟢 Torreta 2: Prensa Folding (Fusionar 3*2=6 y 5+6=11)
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
          }}
        >
          🔴 Torreta 3: Láser DCE (Eliminar asignaciones muertas)
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 6. FASE ENSAMBLADOR: ⚡ REGISTER SWITCHBOARD (Conectar Cables a Registros R0-R7)
// ============================================================================
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
  const currentIns = instrs[pcIdx];

  const handlePatchCable = (isCorrect: boolean, chosenLabel: string, wrongReason: string) => {
    if (!currentIns) return;
    if (isCorrect) {
      const next = pcIdx + 1;
      setPcIdx(next);
      onStepProgress(next);
      if (next >= instrs.length) {
        onWin();
      }
    } else {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Cableado de Placa Base en PC=${currentIns.pc}`,
        userAnswer: chosenLabel,
        whatWentWrong: wrongReason,
        whatShouldBeDone: `En el ciclo PC=${currentIns.pc} debes conectar el bus y accionar la compuerta exacta "${currentIns.text}" dentro del banco R0–R7.`,
      });
    }
  };

  if (!currentIns) return null;

  const isHalt = currentIns.text === 'HALT';
  const isLoadi = currentIns.text.startsWith('LOADI');

  return (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-bright)' }}>
          ⚡ TABLERO DE CABLEADO DE REGISTROS (R0–R7) — Ciclo PC={currentIns.pc} de {instrs.length - 1}
        </span>
      </div>

      {/* Banco visual de los 8 chips de registros R0..R7 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(52px, 1fr))',
          gap: '6px',
          overflowX: 'auto',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
          const isUsedHere = currentIns.text.includes(`R${r}`);
          return (
            <div
              key={r}
              style={{
                padding: '8px 6px',
                borderRadius: '6px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: isUsedHere ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                border: isUsedHere ? '2px solid var(--green)' : '1px solid var(--line)',
                color: isUsedHere ? '#FFFFFF' : 'var(--muted)',
              }}
            >
              🔌 R{r}
            </div>
          );
        })}
      </div>

      {/* Compuertas de cableado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => handlePatchCable(true, currentIns.text, '')}
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            border: '2px solid var(--green)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          ⚡ Enrutar Cable ISA: {currentIns.text}
        </button>

        <button
          type="button"
          onClick={() =>
            handlePatchCable(
              false,
              isHalt
                ? 'Seguir sin emitir HALT (Desbordar contador PC)'
                : isLoadi
                ? 'Cablear LOAD desde celda RAM [0] en vez de constante inmediata LOADI'
                : 'Cablear hacia registro inexistente R9',
              isHalt
                ? 'Olvidaste cerrar el flujo de control con la compuerta HALT (0xFF); la CPU seguiría leyendo memoria vacía.'
                : isLoadi
                ? 'Conectaste el cable al bus de memoria RAM (LOAD) en lugar del generador de constantes inmediatas (LOADI).'
                : 'Intentaste conectar un cable al registro R9, pero el procesador solo posee 8 registros físicos (R0 a R7).'
            )
          }
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          ⚡ Cortocircuito:{' '}
          {isHalt
            ? 'Omitir HALT final'
            : isLoadi
            ? 'Cablear LOAD R0, [0] (Bus RAM)'
            : 'Cablear a Registro R9 (Fuera de rango)'}
        </button>
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

  // La fase 7 (binary) NO lleva mini-juego por instrucción directa del usuario
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
