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
  padding: '1px 6px',
  backgroundColor: 'var(--panel-inset)',
  border: '1px solid var(--line-strong)',
  borderRadius: '4px',
  color: 'var(--text-pure)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  fontSize: '0.7rem',
};

// ============================================================================
// 1. FASE LÉXICA: 🚀 SPACE LEXER (Navecitas Arcade en Carriles Verticales)
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
  const [meteorY, setMeteorY] = useState(12);
  const [laserShotAnim, setLaserShotAnim] = useState<number | null>(null);
  const [hitExplosion, setHitExplosion] = useState<number | null>(null);

  const activeToken = tokens[currentIdx];
  const targetLane = (currentIdx * 3) % 4;

  useEffect(() => {
    setMeteorY(12);
    const interval = setInterval(() => {
      setMeteorY((y) => (y >= 70 ? 70 : y + 1.6));
    }, 140);
    return () => clearInterval(interval);
  }, [currentIdx]);

  const handleFireAtMeteor = (cannonToUse: LaserCannonType, laneToShoot: number) => {
    if (!activeToken) return;
    const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n' : activeToken.lexeme;

    if (laneToShoot !== targetLane) {
      setLaserShotAnim(laneToShoot);
      setTimeout(() => setLaserShotAnim(null), 220);
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

    if (cannonToUse === expectedCannon) {
      setLaserShotAnim(laneToShoot);
      setHitExplosion(targetLane);
      setTimeout(() => {
        setLaserShotAnim(null);
        setHitExplosion(null);
      }, 220);

      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      onStepProgress(nextIdx);
      if (nextIdx >= tokens.length) {
        onWin();
      }
    } else {
      setLaserShotAnim(laneToShoot);
      setTimeout(() => setLaserShotAnim(null), 220);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
        setSelectedCannon((curr) => list[(list.indexOf(curr) + 1) % list.length]);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, LaserCannonType> = { '1': 'ID', '2': 'NUM', '3': 'OP', '4': 'RES' };
        setSelectedCannon(map[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!activeToken) return null;

  const lexDisplay = activeToken.type === 'NEWLINE' ? '\\n' : `"${activeToken.lexeme}"`;
  const activeCannonColor = CANNONS.find((c) => c.id === selectedCannon)?.color || '#38BDF8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          fontSize: '0.76rem',
        }}
      >
        <span style={{ color: 'var(--text-pure)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          🚀 SPACE LEXER — Token {currentIdx + 1}/{tokens.length} (Carril #{targetLane + 1})
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', color: 'var(--muted-light)' }}>
          <span><kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> Mover</span>
          <span><kbd style={kbdStyle}>TAB</kbd> Cañón</span>
          <span><kbd style={kbdStyle}>ESPACIO</kbd> Disparar</span>
        </div>
      </div>

      {/* Pista vertical de caída */}
      <div
        style={{
          position: 'relative',
          height: '380px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--panel-inset)',
          border: '1px solid var(--line)',
          padding: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          overflow: 'hidden',
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
                border: isShipHere ? '1px solid var(--line-focus)' : '1px solid var(--line)',
                backgroundColor: isShipHere ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 6px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                CARRIL {lane + 1}
              </span>

              {hasMeteor && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${meteorY}%`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: hitExplosion === lane ? 'var(--green)' : 'var(--panel-3)',
                    border: `1px solid ${activeCannonColor}`,
                    textAlign: 'center',
                    zIndex: 3,
                    minWidth: '82%',
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted-light)', fontFamily: 'var(--font-mono)' }}>
                    L{activeToken.line}:C{activeToken.col}
                  </div>
                  <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)' }}>
                    {lexDisplay}
                  </strong>
                </div>
              )}

              {laserShotAnim === lane && (
                <div
                  style={{
                    position: 'absolute',
                    top: hasMeteor ? `${meteorY}%` : '8%',
                    bottom: '48px',
                    width: '3px',
                    backgroundColor: activeCannonColor,
                    zIndex: 2,
                  }}
                />
              )}

              <div
                style={{
                  marginTop: 'auto',
                  zIndex: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {isShipHere ? (
                  <>
                    <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>🛸</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        color: activeCannonColor,
                        fontWeight: 700,
                      }}
                    >
                      [{selectedCannon}]
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>·</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selector de Cañones (solo nombre, sin descripciones) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {CANNONS.map((c) => {
          const isSelected = selectedCannon === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCannon(c.id);
                handleFireAtMeteor(c.id, shipLane);
              }}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected ? 'var(--panel-3)' : 'var(--panel-2)',
                border: isSelected ? `1px solid ${c.color}` : '1px solid var(--line)',
                color: 'var(--text-pure)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Cañón {c.shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 2. FASE SINTÁCTICA: 🏗️ AST CRANE BUILDER (Grúa Mecánica de Precedencia AST)
// ============================================================================
interface CraneCrate {
  id: string;
  label: string;
  priority: number;
  isDecoy: boolean;
  explain: string;
}

const AstCraneGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const bays = useMemo(() => {
    const rawStmts: any[] =
      phase.output?.ast?.children || phase.output?.ast?.statements || [];
    const stmts =
      rawStmts.length > 0
        ? rawStmts
        : [
            {
              id: 'fallback',
              kind: 'assign',
              name: 'c',
              expr: {
                id: 'fe',
                kind: 'binop',
                op: '+',
                left: { kind: 'var', name: 'a' },
                right: {
                  kind: 'binop',
                  op: '*',
                  left: { kind: 'var', name: 'b' },
                  right: { kind: 'num', value: 2 },
                },
              },
            },
          ];

    return stmts.map((stmt, sIdx) => {
      const isAssign = stmt.kind?.toLowerCase() === 'assign';
      const stmtLabel = isAssign ? `${stmt.name} = ...` : 'print(...)';
      const expr = stmt.expr;
      const exprKind = expr?.kind?.toLowerCase();

      const rawCrates: CraneCrate[] = [];

      if (exprKind === 'binop') {
        const rightIsBinOp = expr.right?.kind?.toLowerCase() === 'binop';
        const leftIsBinOp = expr.left?.kind?.toLowerCase() === 'binop';
        const hasMul =
          expr.op === '*' ||
          (rightIsBinOp && expr.right?.op === '*') ||
          (leftIsBinOp && expr.left?.op === '*');

        const rightLabel = rightIsBinOp
          ? `${expr.right.left?.name ?? expr.right.left?.value} ${expr.right.op} ${expr.right.right?.name ?? expr.right.right?.value}`
          : `${expr.right?.name ?? expr.right?.value ?? 'der'}`;
        const leftLabel = `${expr.left?.name ?? expr.left?.value ?? 'izq'}`;

        if (hasMul && (expr.op === '+' || expr.op === '-')) {
          rawCrates.push({
            id: `crate-term-${sIdx}`,
            label: `Subárbol (${rightLabel})`,
            priority: 1,
            isDecoy: false,
            explain:
              'En la gramática EBNF de MiniArit, la multiplicación (*) tiene mayor precedencia y se sitúa en el nivel más profundo del AST, por lo que la grúa debe ensamblarla primero.',
          });
          rawCrates.push({
            id: `crate-expr-${sIdx}`,
            label: `Subárbol ${leftLabel} ${expr.op} (${rightLabel})`,
            priority: 2,
            isDecoy: false,
            explain:
              'La operación aditiva (+) agrupa el operando izquierdo con el subárbol multiplicativo ya construido.',
          });
          rawCrates.push({
            id: `crate-decoy-${sIdx}`,
            label: `Subárbol (${leftLabel} ${expr.op} ${expr.right?.left?.name ?? 'b'}) * ${expr.right?.right?.value ?? '2'}`,
            priority: 99,
            isDecoy: true,
            explain:
              'Ese bloque agrupa la suma antes que la multiplicación sin paréntesis explícitos, alterando el resultado matemático del AST.',
          });
        } else {
          rawCrates.push({
            id: `crate-binop-${sIdx}`,
            label: `Expresión (${leftLabel} ${expr.op} ${rightLabel})`,
            priority: 1,
            isDecoy: false,
            explain: `Primero se debe construir el nodo de la operación '${expr.op}' antes de conectarlo a la raíz de la sentencia.`,
          });
          rawCrates.push({
            id: `crate-decoy-op-${sIdx}`,
            label: `Invertir (${rightLabel} = ${leftLabel})`,
            priority: 99,
            isDecoy: true,
            explain:
              'En una asignación o expresión el identificador destino va a la izquierda y el valor evaluado a la derecha.',
          });
        }
      } else {
        const isNeg = exprKind === 'neg';
        const valText = isNeg
          ? `-${expr.operand?.name ?? expr.operand?.value}`
          : `${expr?.name ?? expr?.value ?? '0'}`;
        rawCrates.push({
          id: `crate-val-${sIdx}`,
          label: `Hoja Terminal [${valText}]`,
          priority: 1,
          isDecoy: false,
          explain: `En un árbol sintáctico ascendente, la hoja del operando [${valText}] se coloca antes que el nodo raíz de la sentencia.`,
        });
      }

      rawCrates.push({
        id: `crate-root-${sIdx}`,
        label: `Nodo Raíz [${stmtLabel}]`,
        priority: 10,
        isDecoy: false,
        explain:
          'El nodo raíz de la sentencia se coloca al final para coronar el subárbol cuyos operandos ya fueron izados por la grúa.',
      });

      const shuffled = [...rawCrates];
      let seed = (sIdx + 1) * 7919;
      for (let i = shuffled.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const j = seed % (i + 1);
        const tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      if (shuffled.length > 1 && shuffled[0].priority === 1) {
        const first = shuffled.shift()!;
        shuffled.push(first);
      }

      const fullCode = isAssign
        ? `${stmt.name} = ${
            exprKind === 'binop'
              ? `${expr.left?.name ?? expr.left?.value} ${expr.op} ${
                  expr.right?.kind?.toLowerCase() === 'binop'
                    ? `${expr.right.left?.name ?? expr.right.left?.value} ${expr.right.op} ${expr.right.right?.name ?? expr.right.right?.value}`
                    : `${expr.right?.name ?? expr.right?.value}`
                }`
              : `${expr?.name ?? expr?.value}`
          }`
        : `print(${expr?.name ?? expr?.value ?? 'expr'})`;

      return {
        bayIndex: sIdx,
        title: `Sentencia #${sIdx + 1}: ${fullCode}`,
        crates: shuffled,
      };
    });
  }, [phase]);

  const [bayIdx, setBayIdx] = useState(0);
  const [craneCol, setCraneCol] = useState(0);
  const [hoistedIds, setHoistedIds] = useState<string[]>([]);
  const [clawDropping, setClawDropping] = useState(false);

  const currentBay = bays[bayIdx];
  const crates = currentBay?.crates || [];

  const requiredCratesSorted = useMemo(
    () => crates.filter((c) => !c.isDecoy).sort((a, b) => a.priority - b.priority),
    [crates]
  );

  const nextExpectedCrate = useMemo(
    () => requiredCratesSorted.find((c) => !hoistedIds.includes(c.id)) || null,
    [requiredCratesSorted, hoistedIds]
  );

  const handleDropClaw = (targetColIndex?: number) => {
    const col = typeof targetColIndex === 'number' ? targetColIndex : craneCol;
    if (!currentBay || !nextExpectedCrate) return;
    const crate = crates[col];
    if (!crate || hoistedIds.includes(crate.id)) return;

    setClawDropping(true);
    setTimeout(() => setClawDropping(false), 180);

    if (crate.isDecoy) {
      onMistake({
        phaseName: 'Análisis Sintáctico (AST Crane Builder)',
        stepTitle: `Inversión de Precedencia en ${currentBay.title}`,
        userAnswer: `La grúa capturó el bloque inválido "${crate.label}"`,
        whatWentWrong: crate.explain,
        whatShouldBeDone: `Mueve la grúa con ◀ / ▶ hasta "${nextExpectedCrate.label}" y pulsa ESPACIO para izarlo al árbol AST.`,
      });
      return;
    }

    if (crate.id !== nextExpectedCrate.id) {
      onMistake({
        phaseName: 'Análisis Sintáctico (AST Crane Builder)',
        stepTitle: `Error de Jerarquía AST en ${currentBay.title}`,
        userAnswer: `Intentaste izar "${crate.label}" antes de "${nextExpectedCrate.label}"`,
        whatWentWrong:
          'En la construcción ascendente del AST, no puedes colocar un nodo padre sin haber ensamblado primero sus subexpresiones e hijos de mayor precedencia.',
        whatShouldBeDone: `${nextExpectedCrate.explain} Desplaza la grúa hacia "${nextExpectedCrate.label}" y baja la garra.`,
      });
      return;
    }

    const updated = [...hoistedIds, crate.id];
    setHoistedIds(updated);

    if (updated.length >= requiredCratesSorted.length) {
      const nextBay = bayIdx + 1;
      onStepProgress(nextBay);
      if (nextBay >= bays.length) {
        onWin();
      } else {
        setBayIdx(nextBay);
        setHoistedIds([]);
        setCraneCol(0);
      }
    }
  };

  const latestCraneRef = useRef({ craneCol, crates, handleDropClaw });
  useEffect(() => {
    latestCraneRef.current = { craneCol, crates, handleDropClaw };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { craneCol: cc, crates: cr, handleDropClaw: hdc } = latestCraneRef.current;
      if (cr.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setCraneCol((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setCraneCol((c) => Math.min(cr.length - 1, c + 1));
      } else if (
        e.key === 'ArrowDown' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.key === ' ' ||
        e.code === 'Space' ||
        e.key === 'Enter'
      ) {
        e.preventDefault();
        hdc(cc);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentBay) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)', fontWeight: 700 }}>
            🏗️ GRÚA MECÁNICA AST (AST CRANE BUILDER) — {currentBay.title}
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-light)', margin: '2px 0 0 0' }}>
            Ensambla el árbol desde las hojas y operaciones de mayor precedencia (*) hasta la raíz de la sentencia ({bayIdx + 1}/{bays.length}).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.74rem', color: 'var(--muted-light)' }}>
          <span><kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> Mover Grúa</span>
          <span><kbd style={kbdStyle}>▼</kbd> / <kbd style={kbdStyle}>ESPACIO</kbd> Bajar Garra</span>
        </div>
      </div>

      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--panel-inset)',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Riel superior y carro de la grúa */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${crates.length}, 1fr)`,
            gap: '10px',
            paddingBottom: '8px',
            borderBottom: '2px dashed var(--line-strong)',
          }}
        >
          {crates.map((c, idx) => {
            const isHere = craneCol === idx;
            return (
              <div
                key={`rail-${c.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  transition: 'transform var(--motion-fast)',
                  transform: isHere && clawDropping ? 'translateY(10px)' : 'translateY(0)',
                }}
              >
                {isHere ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      color: 'var(--blue-bright)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>═══[⚙️]═══</span>
                    <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>🪝</span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    ───┼───
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Plataforma de Contenedores AST */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${crates.length}, 1fr)`,
            gap: '10px',
          }}
        >
          {crates.map((crate, idx) => {
            const isHoisted = hoistedIds.includes(crate.id);
            const isUnderClaw = craneCol === idx;
            return (
              <button
                key={crate.id}
                type="button"
                disabled={isHoisted}
                onClick={() => {
                  setCraneCol(idx);
                  handleDropClaw(idx);
                }}
                style={{
                  minHeight: '78px',
                  padding: '12px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isHoisted
                    ? 'rgba(16, 185, 129, 0.08)'
                    : isUnderClaw
                    ? 'var(--panel-3)'
                    : 'var(--panel-2)',
                  border: isHoisted
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : isUnderClaw
                    ? '1px solid var(--line-focus)'
                    : '1px solid var(--line)',
                  color: isHoisted ? 'var(--green)' : 'var(--text-pure)',
                  cursor: isHoisted ? 'default' : 'pointer',
                  opacity: isHoisted ? 0.55 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  transition: 'border-color var(--motion-fast), background-color var(--motion-fast)',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: isHoisted ? 'var(--green)' : 'var(--muted)' }}>
                  {isHoisted ? '✓ IZADO AL AST' : isUnderClaw ? '🪝 BAJAR GARRA [ESPACIO]' : `CARRIL #${idx + 1}`}
                </span>
                <strong style={{ fontSize: '0.84rem', textAlign: 'center', lineHeight: 1.25 }}>
                  {crate.label}
                </strong>
              </button>
            );
          })}
        </div>

        {/* Pila de Nodos AST ya ensamblados */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '8px',
            borderTop: '1px solid var(--line)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--muted-light)',
          }}
        >
          <span>Nodos acoplados ({hoistedIds.length}/{requiredCratesSorted.length}):</span>
          {hoistedIds.length === 0 ? (
            <span style={{ color: 'var(--muted)' }}>Ninguno aún — captura primero el nodo de mayor precedencia</span>
          ) : (
            hoistedIds.map((id, idx) => {
              const found = crates.find((c) => c.id === id);
              return (
                <span
                  key={id}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--green-subtle)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--green-bright)',
                  }}
                >
                  {idx + 1}. {found?.label}
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FASE SEMÁNTICA: 🧭 SYMBOL MAZE 6x6 (Adyacencia Estricta, Orden Secuencial y Terminales Camuflados)
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
  const secondVar = symbols[1]?.name || 'b';
  const thirdVar = symbols[2]?.name || 'c';

  const walls = useMemo(
    () =>
      new Set([
        '1,0', '1,3', '1,4', '1,5',
        '2,4', '2,5',
        '3,0', '3,1', '3,5',
        '4,0', '4,1', '4,3',
        '5,0', '5,1', '5,3',
      ]),
    []
  );

  const tryMove = (targetR: number, targetC: number) => {
    if (targetR < 0 || targetR > 5 || targetC < 0 || targetC > 5) return;

    // Adyacencia ortogonal estricta: prohibido saltar casillas o elegir en desorden haciendo clic lejano
    const manhattanDist = Math.abs(targetR - dronePos.r) + Math.abs(targetC - dronePos.c);
    if (manhattanDist !== 1) {
      return;
    }

    if (walls.has(`${targetR},${targetC}`)) {
      return;
    }

    // Nodo camuflado 1 en (0, 5): "c = a + z_undef" (Variable no declarada E-301)
    if (targetR === 0 && targetC === 5) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: 'Error Semántico: Variable No Declarada (E-301)',
        userAnswer: 'Ejecutaste el terminal "c = a + z_undef" en (0, 5)',
        whatWentWrong:
          'El identificador "z_undef" no ha sido declarado en ninguna línea previa del programa. El analizador semántico rechaza cualquier lectura fuera de la Tabla de Símbolos.',
        whatShouldBeDone: `Retrocede hasta la encrucijada (0, 2) y dirígete a registrar primero "DECL ${firstVar}" en (1, 1).`,
      });
      return;
    }

    // Nodo camuflado 2 en (2, 0): "x = b + 1" (Uso de 'b' antes de su declaración en línea 2 - E-301)
    if (targetR === 2 && targetC === 0) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: 'Error de Alcance Secuencial: Variable No Declarada Aún (E-301)',
        userAnswer: `Intentaste evaluar "x = ${secondVar} + 1" en (2, 0) antes de declarar '${secondVar}'`,
        whatWentWrong: `Aunque '${secondVar}' aparece en el programa, en este punto del recorrido aún no ha sido registrada en la Tabla de Símbolos.`,
        whatShouldBeDone: `Regresa a (2, 2), toma el corredor derecho hacia (3, 4) y registra primero "DECL ${secondVar}".`,
      });
      return;
    }

    // Nodo camuflado 3 en (5, 2): "print(res)" (Identificador inexistente en tabla - E-301)
    if (targetR === 5 && targetC === 2) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: 'Error Semántico: Variable No Declarada (E-301)',
        userAnswer: 'Activaste el terminal "print(res)" en (5, 2)',
        whatWentWrong:
          'La variable "res" no existe en la Tabla de Símbolos. La variable calculada en el programa es "' + thirdVar + '".',
        whatShouldBeDone: `Sube de regreso a (2, 2) y sigue la ruta hacia "DECL ${secondVar}" en (3, 4).`,
      });
      return;
    }

    // Orden secuencial estricto: No se puede declarar la 2da variable en (3, 4) sin haber declarado la 1ra en (1, 1)
    if (targetR === 3 && targetC === 4 && !collectedKeys.includes(firstVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: 'Violación de Orden de Declaración por Línea',
        userAnswer: `Intentaste registrar "DECL ${secondVar}" (Línea 2) sin haber registrado "DECL ${firstVar}" (Línea 1)`,
        whatWentWrong:
          'El analizador semántico recorre el AST estrictamente línea por línea de arriba hacia abajo; no puede procesar la línea 2 antes que la línea 1.',
        whatShouldBeDone: `Dirígete primero al terminal "DECL ${firstVar}" en (1, 1) y luego vuelve a (3, 4).`,
      });
      return;
    }

    // Compuerta de evaluación en (4, 4): requiere que tanto firstVar como secondVar estén en la Tabla de Símbolos
    if (targetR === 4 && targetC === 4 && (!collectedKeys.includes(firstVar) || !collectedKeys.includes(secondVar))) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: `Verificación de Expresión: ${thirdVar} = ${firstVar} + ${secondVar} * 2`,
        userAnswer: `Intentaste evaluar "${thirdVar} = ${firstVar} + ${secondVar} * 2" sin tener '${firstVar}' y '${secondVar}' en la Tabla de Símbolos`,
        whatWentWrong: `Para validar la línea 3, ambos operandos ('${firstVar}' y '${secondVar}') deben estar previamente registrados (E-301).`,
        whatShouldBeDone: `Asegúrate de activar en orden "DECL ${firstVar}" en (1, 1) y "DECL ${secondVar}" en (3, 4) antes de cruzar (4, 4).`,
      });
      return;
    }

    // Meta en (5, 5): print(c) requiere haber validado (4, 4)
    if (targetR === 5 && targetC === 5 && !unlockedGates.includes(secondVar)) {
      onMistake({
        phaseName: 'Análisis Semántico (Symbol Maze 6x6)',
        stepTitle: `Verificación de Salida: print(${thirdVar})`,
        userAnswer: `Intentaste ejecutar "print(${thirdVar})" sin haber declarado '${thirdVar}' en (4, 4)`,
        whatWentWrong:
          'No se puede imprimir una variable cuya asignación no ha sido validada previamente en el análisis semántico.',
        whatShouldBeDone: `Pasa primero por el nodo "${thirdVar} = ${firstVar} + ${secondVar} * 2" en (4, 4) y luego avanza a (5, 5).`,
      });
      return;
    }

    setDronePos({ r: targetR, c: targetC });

    if (targetR === 1 && targetC === 1 && !collectedKeys.includes(firstVar)) {
      setCollectedKeys((prev) => [...prev, firstVar]);
      onStepProgress(1);
    }
    if (targetR === 3 && targetC === 4 && !collectedKeys.includes(secondVar)) {
      setCollectedKeys((prev) => [...prev, secondVar]);
      onStepProgress(2);
    }
    if (targetR === 4 && targetC === 4 && !unlockedGates.includes(secondVar)) {
      setUnlockedGates((prev) => [...prev, secondVar]);
      onStepProgress(3);
    }
    if (targetR === 5 && targetC === 5) {
      onWin();
    }
  };

  const latestMazeRef = useRef({ dronePos, tryMove });
  useEffect(() => {
    latestMazeRef.current = { dronePos, tryMove };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)', fontWeight: 700 }}>
            🧭 LABERINTO MULTICAMINO 6x6 (SYMBOL MAZE) — Llaves en Tabla: [{collectedKeys.join(', ') || 'ninguna'}]
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-light)', margin: '2px 0 0 0' }}>
            Desplázate casilla por casilla (<kbd style={kbdStyle}>▲</kbd><kbd style={kbdStyle}>▼</kbd><kbd style={kbdStyle}>◀</kbd><kbd style={kbdStyle}>▶</kbd>). Verifica qué variables existen en la Tabla de Símbolos antes de entrar a un nodo ◈.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r - 1, dronePos.c)}>▲</Button>
          <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r + 1, dronePos.c)}>▼</Button>
          <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r, dronePos.c - 1)}>◀</Button>
          <Button variant="secondary" size="sm" onClick={() => tryMove(dronePos.r, dronePos.c + 1)}>▶</Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          padding: '12px',
          backgroundColor: 'var(--panel-inset)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((r) =>
          [0, 1, 2, 3, 4, 5].map((c) => {
            const isDrone = dronePos.r === r && dronePos.c === c;
            const isWall = walls.has(`${r},${c}`);
            const isAdjacent = Math.abs(r - dronePos.r) + Math.abs(c - dronePos.c) === 1 && !isWall;

            const isFalseNode1 = r === 0 && c === 5;
            const isFalseNode2 = r === 2 && c === 0;
            const isFalseNode3 = r === 5 && c === 2;
            const isKey1 = r === 1 && c === 1;
            const isKey2 = r === 3 && c === 4;
            const isGate = r === 4 && c === 4;
            const isGoal = r === 5 && c === 5;

            const isTerminalNode =
              isFalseNode1 || isFalseNode2 || isFalseNode3 || isKey1 || isKey2 || isGate || isGoal;

            let cellLabel = '';
            let icon = '·';

            if (isWall) {
              cellLabel = '';
              icon = '▪';
            } else if (isFalseNode1) {
              cellLabel = `${thirdVar} = ${firstVar} + z_undef`;
              icon = '◈';
            } else if (isFalseNode2) {
              cellLabel = `x = ${secondVar} + 1`;
              icon = '◈';
            } else if (isFalseNode3) {
              cellLabel = 'print(res)';
              icon = '◈';
            } else if (isKey1) {
              cellLabel = `DECL ${firstVar} = 5`;
              icon = collectedKeys.includes(firstVar) ? '✓' : '◈';
            } else if (isKey2) {
              cellLabel = `DECL ${secondVar} = 3`;
              icon = collectedKeys.includes(secondVar) ? '✓' : '◈';
            } else if (isGate) {
              cellLabel = `${thirdVar} = ${firstVar} + ${secondVar} * 2`;
              icon = unlockedGates.includes(secondVar) ? '✓' : '◈';
            } else if (isGoal) {
              cellLabel = `print(${thirdVar})`;
              icon = '◈';
            }

            const isCompletedNode =
              (isKey1 && collectedKeys.includes(firstVar)) ||
              (isKey2 && collectedKeys.includes(secondVar)) ||
              (isGate && unlockedGates.includes(secondVar));

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={isWall}
                onClick={() => tryMove(r, c)}
                style={{
                  minHeight: '58px',
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isWall
                    ? '#030508'
                    : isDrone
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isCompletedNode
                    ? 'rgba(16, 185, 129, 0.08)'
                    : isTerminalNode
                    ? 'var(--panel-3)'
                    : 'var(--panel-2)',
                  border: isDrone
                    ? '1px solid var(--green)'
                    : isAdjacent
                    ? '1px solid rgba(56, 189, 248, 0.35)'
                    : isTerminalNode
                    ? '1px solid var(--line-strong)'
                    : '1px solid var(--line)',
                  color: isWall ? 'var(--muted)' : 'var(--text-pure)',
                  cursor: isWall ? 'default' : isAdjacent ? 'pointer' : 'not-allowed',
                  opacity: isWall ? 0.35 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  transition: 'border-color var(--motion-fast), background-color var(--motion-fast)',
                }}
              >
                <span
                  style={{
                    fontSize: isDrone ? '1.1rem' : '0.85rem',
                    color: isCompletedNode ? 'var(--green)' : 'var(--blue-bright)',
                  }}
                >
                  {isDrone ? '🤖' : icon}
                </span>
                {cellLabel && (
                  <span style={{ textAlign: 'center', lineHeight: 1.15, fontWeight: 600 }}>
                    {cellLabel}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. FASE CÓDIGO INTERMEDIO (TAC): 🎯 POST-ORDER SNIPER (Sin Señuelos Artificiales)
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

  // Permutación determinista Fisher-Yates SOLO con las instrucciones reales del programa (0 señuelos falsos, 0 duplicados)
  const galleryTargets = useMemo(() => {
    const realTargets = instrs.map((ins) => ({
      id: `tac-${ins.index}`,
      orderIndex: ins.index,
      text: ins.text,
    }));
    const shuffled = [...realTargets];
    let seed = 12345;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    if (shuffled.length > 1 && shuffled[0].orderIndex === 0) {
      const first = shuffled.shift()!;
      shuffled.push(first);
    }
    return shuffled;
  }, [instrs]);

  const expectedTarget = instrs[shotCount];

  const handleShootPlate = (plate: { id: string; orderIndex: number; text: string }) => {
    if (!expectedTarget) return;

    if (plate.orderIndex === shotCount) {
      const next = shotCount + 1;
      setShotCount(next);
      onStepProgress(next);
      if (next >= instrs.length) {
        onWin();
      }
    } else {
      onMistake({
        phaseName: 'Código Intermedio TAC (Post-Order Sniper)',
        stepTitle: `Secuencia de Emisión TAC (#${shotCount + 1} de ${instrs.length})`,
        userAnswer: `Seleccionaste "${plate.text}" antes de tiempo`,
        whatWentWrong: `Intentaste emitir "${plate.text}" sin haber emitido antes "${expectedTarget.text}". El generador TAC recorre el AST en postorden, emitiendo primero las asignaciones previas y subexpresiones hojas.`,
        whatShouldBeDone: `Apunta a la instrucción "${expectedTarget.text}" y pulsa ESPACIO.`,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { galleryTargets: gt, focusedPlateIdx: fp, handleShootPlate: hs } = latestSniperRef.current;
      if (gt.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setFocusedPlateIdx((i) => (i - 1 + gt.length) % gt.length);
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === 'Tab'
      ) {
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

  if (!expectedTarget && shotCount < instrs.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)', fontWeight: 700 }}>
            🎯 CAMPO DE TIRO POST-ORDER SNIPER — Dianas Derribadas: {shotCount} / {instrs.length}
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-light)', margin: '2px 0 0 0' }}>
            Emite las instrucciones de 3 direcciones en el orden exacto de evaluación postorden del AST.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.74rem', color: 'var(--muted-light)' }}>
          <span><kbd style={kbdStyle}>◀</kbd> <kbd style={kbdStyle}>▶</kbd> Mover Mira</span>
          <span><kbd style={kbdStyle}>ESPACIO</kbd> Disparar</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '8px',
          padding: '12px',
          backgroundColor: 'var(--panel-inset)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)',
        }}
      >
        {galleryTargets.map((plate, pIdx) => {
          const alreadyShot = plate.orderIndex < shotCount;
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
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: alreadyShot
                  ? 'rgba(16, 185, 129, 0.08)'
                  : isFocused
                  ? 'var(--panel-3)'
                  : 'var(--panel-2)',
                border: alreadyShot
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : isFocused
                  ? '1px solid var(--line-focus)'
                  : '1px solid var(--line)',
                color: alreadyShot ? 'var(--green)' : 'var(--text-pure)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: alreadyShot ? 'default' : 'crosshair',
                opacity: alreadyShot ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'border-color var(--motion-fast), background-color var(--motion-fast)',
              }}
            >
              <span>
                {alreadyShot ? '✓' : isFocused ? '⊕' : '🎯'} {plate.text}
              </span>
              <span style={{ fontSize: '0.7rem', color: alreadyShot ? 'var(--green)' : 'var(--muted-light)' }}>
                {alreadyShot ? 'EMITIDA' : 'DISPARAR'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 5. FASE OPTIMIZACIÓN: ⚗️ REACTOR ALGEBRAICO Y BARRIDO DCE (Cálculo Real + Purga)
// ============================================================================
interface ReactorChallenge {
  id: string;
  stage: 'FOLD' | 'DCE';
  rawInstr: string;
  contextHint: string;
  options: Array<{
    label: string;
    isCorrect: boolean;
    errorExplain: string;
  }>;
  correctExplain: string;
}

const OptimizerDefenseGame: React.FC<{
  phase: PhaseResult;
  onWin: () => void;
  onMistake: (f: GameMistakeFeedback) => void;
  onStepProgress: (idx: number) => void;
}> = ({ phase, onWin, onMistake, onStepProgress }) => {
  const challenges: ReactorChallenge[] = useMemo(
    () => [
      {
        id: 'opt-1',
        stage: 'FOLD',
        rawInstr: 't1 = b * 2',
        contextHint: 'Banco de constantes conocido: a = 5, b = 3',
        correctExplain:
          'Al propagar b → 3 y plegar 3 * 2 en tiempo de compilación, la instrucción se reduce a la constante t1 = 6.',
        options: [
          { label: 't1 = 5', isCorrect: false, errorExplain: 'Sumaste 3 + 2 en lugar de multiplicar 3 * 2.' },
          { label: 't1 = 6', isCorrect: true, errorExplain: '' },
          { label: 't1 = 10', isCorrect: false, errorExplain: 'Usaste el valor de "a" (5) en lugar del valor de "b" (3).' },
          {
            label: 'ELIMINAR (DCE) sin evaluar',
            isCorrect: false,
            errorExplain:
              'No puedes eliminar t1 todavía porque la siguiente instrucción (t2 = a + t1) depende de su valor.',
          },
        ],
      },
      {
        id: 'opt-2',
        stage: 'FOLD',
        rawInstr: 't2 = a + t1',
        contextHint: 'Banco de constantes actualizado: a = 5, b = 3, t1 = 6',
        correctExplain: 'Al propagar a → 5 y t1 → 6, la ALU del compilador pliega 5 + 6 = 11.',
        options: [
          { label: 't2 = 8', isCorrect: false, errorExplain: 'Sumaste a + b (5 + 3) ignorando que t1 vale 6.' },
          {
            label: 't2 = 16',
            isCorrect: false,
            errorExplain: 'Evaluaste (5 + 3) * 2 = 16 invirtiendo la precedencia de operadores.',
          },
          { label: 't2 = 11', isCorrect: true, errorExplain: '' },
          { label: 't2 = 30', isCorrect: false, errorExplain: 'Multiplicaste 5 * 6 en lugar de sumar 5 + 6.' },
        ],
      },
      {
        id: 'opt-3',
        stage: 'DCE',
        rawInstr: 'Asignaciones: a = 5, b = 3, t1 = 6, t2 = 11, c = 11',
        contextHint: 'La instrucción final ya fue propagada a: print 11',
        correctExplain:
          'Como print 11 ya usa la constante inmediata y ninguna instrucción posterior lee a, b, t1, t2 ni c, todas son Código Muerto (DCE).',
        options: [
          {
            label: 'CONSERVAR todas en el binario',
            isCorrect: false,
            errorExplain:
              'Conservar asignaciones que nadie vuelve a leer desperdicia registros y ciclos de reloj en la máquina virtual.',
          },
          { label: 'PURGAR a, b, t1, t2, c y CONSERVAR print 11', isCorrect: true, errorExplain: '' },
          {
            label: 'PURGAR todo incluyendo print 11',
            isCorrect: false,
            errorExplain: '¡Prohibido eliminar print 11! Tiene un efecto observable de salida por consola.',
          },
          {
            label: 'CONSERVAR solo t1 = 6 y t2 = 11',
            isCorrect: false,
            errorExplain: 'Los temporales t1 y t2 tampoco vuelven a leerse una vez que su valor se propagó a print 11.',
          },
        ],
      },
    ],
    []
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [focusedOpt, setFocusedOpt] = useState(0);
  const current = challenges[stepIdx];

  const handleSelectOption = (optIndex: number) => {
    if (!current) return;
    const chosen = current.options[optIndex];
    if (!chosen) return;

    if (chosen.isCorrect) {
      const next = stepIdx + 1;
      setStepIdx(next);
      setFocusedOpt(0);
      onStepProgress(next);
      if (next >= challenges.length) {
        onWin();
      }
    } else {
      onMistake({
        phaseName: 'Optimización TAC (Reactor Algebraico y DCE)',
        stepTitle: `Transformación de [${current.rawInstr}]`,
        userAnswer: `Elegiste: "${chosen.label}"`,
        whatWentWrong: chosen.errorExplain,
        whatShouldBeDone: current.correctExplain,
      });
    }
  };

  const latestOptRef = useRef({ focusedOpt, current, handleSelectOption });
  useEffect(() => {
    latestOptRef.current = { focusedOpt, current, handleSelectOption };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { focusedOpt: fo, current: cur, handleSelectOption: hso } = latestOptRef.current;
      if (!cur) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        setFocusedOpt(idx);
        hso(idx);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setFocusedOpt((i) => (i - 1 + cur.options.length) % cur.options.length);
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === 'Tab'
      ) {
        e.preventDefault();
        setFocusedOpt((i) => (i + 1) % cur.options.length);
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        hso(fo);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!current) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)', fontWeight: 700 }}>
            ⚗️ REACTOR DE OPTIMIZACIÓN (TOWER DEFENSE DEL OPTIMIZADOR) — Paso {stepIdx + 1} de {challenges.length}
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-light)', margin: '2px 0 0 0' }}>
            Calcula el plegado exacto de constantes y decide qué instrucciones sobreviven al barrido de código muerto ({phase.summary}).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.74rem', color: 'var(--muted-light)' }}>
          <span><kbd style={kbdStyle}>1-4</kbd> o <kbd style={kbdStyle}>▲</kbd><kbd style={kbdStyle}>▼</kbd> Elegir</span>
          <span><kbd style={kbdStyle}>ESPACIO</kbd> Aplicar</span>
        </div>
      </div>

      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--panel-inset)',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--blue-bright)', display: 'block' }}>
              {current.stage === 'FOLD'
                ? 'ETAPA: PROPAGACIÓN Y PLEGADO ARITMÉTICO'
                : 'ETAPA: BARRIDO DE CÓDIGO MUERTO (DCE)'}
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-pure)' }}>
              {current.rawInstr}
            </strong>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-light)' }}>
            {current.contextHint}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
            gap: '8px',
          }}
        >
          {current.options.map((opt, idx) => {
            const isFocused = focusedOpt === idx;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setFocusedOpt(idx);
                  handleSelectOption(idx);
                }}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isFocused ? 'var(--panel-3)' : 'var(--panel-2)',
                  border: isFocused ? '1px solid var(--line-focus)' : '1px solid var(--line)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'border-color var(--motion-fast), background-color var(--motion-fast)',
                }}
              >
                <span>{opt.label}</span>
                <kbd style={kbdStyle}>{idx + 1}</kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. FASE ENSAMBLADOR: ⚡ REGISTER SWITCHBOARD (Sin Auto-Selección ni Spoilers)
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
  // NUNCA auto-seleccionamos el registro esperado: el jugador debe elegirlo manualmente
  const [selectedReg, setSelectedReg] = useState<number | null>(null);

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

  const microSpec = useMemo(() => {
    if (!currentIns) return '';
    const text = currentIns.text;
    if (text.startsWith('LOADI')) {
      const parts = text.split(',');
      const imm = parts[1]?.trim() || 'constante';
      return `Cargar la constante inmediata (${imm}) en el primer registro de trabajo del procesador (índice 0).`;
    }
    if (text.startsWith('PRINT')) {
      return `Enviar al puerto de salida estándar el valor actualmente alojado en el registro acumulador R0.`;
    }
    if (text.startsWith('HALT')) {
      return `Detener el ciclo de reloj de la máquina virtual (instrucción de control sin operandos de registro).`;
    }
    return `Codificar la micro-operación correspondiente al ciclo PC=${currentIns.pc}.`;
  }, [currentIns]);

  const handleActivateOpcodeGate = (opcodeClicked: string) => {
    if (!currentIns) return;

    if (expectedReg !== null && selectedReg !== expectedReg) {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Banco de Registros en Ciclo PC=${currentIns.pc}`,
        userAnswer: `Intentaste despachar [${opcodeClicked}] con el registro [${selectedReg !== null ? `R${selectedReg}` : 'SIN REGISTRO'}] seleccionado`,
        whatWentWrong: `Esta operación requiere direccionar el registro R${expectedReg}, pero tienes seleccionado ${selectedReg !== null ? `R${selectedReg}` : 'ningún registro'}.`,
        whatShouldBeDone: `Selecciona primero el registro [R${expectedReg}] (con las teclas 0–7 o clic) y luego despacha el opcode correcto.`,
      });
      return;
    }

    if (expectedReg === null && selectedReg !== null) {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Instrucción sin Registro en Ciclo PC=${currentIns.pc}`,
        userAnswer: `Dejaste activo el registro R${selectedReg} para una instrucción de parada del sistema`,
        whatWentWrong: `La instrucción de cierre del procesador no recibe registros de datos (los bytes dst y src van en 0x00).`,
        whatShouldBeDone: `Selecciona [SIN REG] y despacha el opcode de detención del procesador.`,
      });
      return;
    }

    if (opcodeClicked !== expectedOpcode) {
      onMistake({
        phaseName: 'Ensamblador ISA (Register Switchboard)',
        stepTitle: `Selección de Opcode ISA en PC=${currentIns.pc}`,
        userAnswer: `Despachaste el opcode [${opcodeClicked}]`,
        whatWentWrong:
          opcodeClicked === 'LOAD' && expectedOpcode === 'LOADI'
            ? 'LOAD lee una dirección de memoria RAM, pero aquí necesitas cargar un valor numérico inmediato (LOADI).'
            : `El opcode [${opcodeClicked}] no cumple la especificación de la micro-operación actual.`,
        whatShouldBeDone: `Selecciona el opcode [${expectedOpcode}] para cumplir con la especificación del ciclo PC=${currentIns.pc}.`,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { focusedOpcodeIdx: fo, handleActivateOpcodeGate: ha } = latestSwitchboardRef.current;

      if (['0', '1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        e.preventDefault();
        setSelectedReg(parseInt(e.key, 10));
      } else if (e.key === 'x' || e.key === 'X' || e.key === 'Backspace') {
        e.preventDefault();
        setSelectedReg(null);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setFocusedOpcodeIdx((i) => (i - 1 + ISA_OPCODES.length) % ISA_OPCODES.length);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'Tab') {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-pure)', fontWeight: 700 }}>
            ⚡ DESPACHADOR ISA Y BANCO DE REGISTROS — Ciclo PC={currentIns.pc} ({pcIdx + 1}/{instrs.length})
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-light)', margin: '2px 0 0 0' }}>
            1° Asigna el registro de trabajo (<kbd style={kbdStyle}>0-7</kbd> o <kbd style={kbdStyle}>X</kbd> sin registro) &bull; 2° Despacha el Opcode (<kbd style={kbdStyle}>◀</kbd><kbd style={kbdStyle}>▶</kbd> + <kbd style={kbdStyle}>ESPACIO</kbd>).
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--panel-inset)',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--panel-2)',
            border: '1px solid var(--line-strong)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: 'var(--text-pure)',
          }}
        >
          <span style={{ color: 'var(--blue-bright)', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>
            ESPECIFICACIÓN DE MICRO-OPERACIÓN (PC={currentIns.pc}):
          </span>
          {microSpec}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
            gap: '6px',
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
                  padding: '8px 6px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: isWired ? 'var(--panel-3)' : 'var(--panel-2)',
                  border: isWired ? '1px solid var(--green)' : '1px solid var(--line)',
                  color: isWired ? 'var(--green-bright)' : 'var(--muted-light)',
                  cursor: 'pointer',
                }}
              >
                R{r}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedReg(null)}
            style={{
              padding: '8px 6px',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: selectedReg === null ? 'var(--panel-3)' : 'var(--panel-2)',
              border: selectedReg === null ? '1px solid var(--blue-bright)' : '1px solid var(--line)',
              color: selectedReg === null ? 'var(--blue-bright)' : 'var(--muted-light)',
              cursor: 'pointer',
            }}
          >
            SIN REG
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
            gap: '8px',
          }}
        >
          {ISA_OPCODES.map((op, oIdx) => {
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
                  backgroundColor: isFocused ? 'var(--panel-3)' : 'var(--panel-2)',
                  border: isFocused ? '1px solid var(--line-focus)' : '1px solid var(--line)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{op}</span>
                {isFocused && <span style={{ color: 'var(--blue-bright)', fontSize: '0.7rem' }}>⏎</span>}
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
        gap: '12px',
        padding: '16px',
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Chip label="SIMULACIÓN ACTIVA" variant="green" />
          <strong style={{ color: 'var(--text-pure)', fontSize: '0.95rem', fontWeight: 600 }}>
            {phase.name}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--blue-bright)',
              padding: '3px 8px',
              backgroundColor: 'var(--panel-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Progreso: {stepsDone}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: mistakesCount === 0 ? 'var(--muted-light)' : 'var(--red)',
              padding: '3px 8px',
              backgroundColor: 'var(--panel-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
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
            <AstCraneGame
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
            padding: '16px',
            backgroundColor: 'var(--green-subtle)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-pure)', margin: 0 }}>
              Fase Completada — {phase.name}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: '4px 0 0 0' }}>
              Verificaste todos los pasos internos de esta etapa ({mistakesCount} fallos registrados).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setPhaseCompleted(false)}>
              Repetir fase
            </Button>
            {onCompletePhase && (
              <Button variant="primary" size="sm" onClick={onCompletePhase}>
                Siguiente Fase →
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
