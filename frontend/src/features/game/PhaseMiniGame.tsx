import React, { useEffect, useMemo, useState } from 'react';
import { PhaseId, PhaseResult } from '../../api/schema';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ErrorFeedbackModal, GameMistakeFeedback } from './ErrorFeedbackModal';

export interface MiniGameOption {
  id: string;
  label: string;
  isCorrect: boolean;
  wrongReason: string;
}

export interface MiniGameChallenge {
  id: string;
  stepTitle: string;
  prompt: string;
  contextCode?: string;
  correctActionExplain: string;
  completedBadge: string;
  options: MiniGameOption[];
}

interface PhaseMiniGameProps {
  phase: PhaseResult;
  onCompletePhase?: () => void;
  onSyncStepIndex?: (stepIdx: number) => void;
}

const TOKEN_LABELS: Record<string, string> = {
  ID: 'ID (Identificador de variable)',
  NUM: 'NUM (Constante numérica entera)',
  ASSIGN: 'ASSIGN (Operador de asignación "=")',
  PLUS: 'PLUS (Operador suma "+")',
  MINUS: 'MINUS (Operador resta "-")',
  STAR: 'STAR (Operador multiplicación "*")',
  LPAREN: 'LPAREN (Paréntesis izquierdo "(")',
  RPAREN: 'RPAREN (Paréntesis derecho ")")',
  PRINT: 'PRINT (Palabra reservada de salida)',
  NEWLINE: 'NEWLINE (Fin de sentencia / salto de línea)',
};

function buildChallengesForPhase(phase: PhaseResult): MiniGameChallenge[] {
  const id: PhaseId = phase.id;
  const output = phase.output || {};

  // 1. FASE LÉXICA: Clasificar cada token del programa
  if (id === 'lexical') {
    const rawTokens: Array<{ type: string; lexeme: string; line: number; col: number }> =
      output.tokens || [];
    // Filtramos EOF para centrarnos en los tokens reales y limitamos los NEWLINE repetitivos a 1 para fluidez, o incluimos todos los visibles
    const tokens = rawTokens.filter((t) => t.type !== 'EOF');
    if (tokens.length === 0) return [];

    const allTypes = ['ID', 'NUM', 'ASSIGN', 'PLUS', 'MINUS', 'STAR', 'PRINT', 'NEWLINE'];

    return tokens.map((tok, idx) => {
      const displayLexeme = tok.type === 'NEWLINE' ? '\\n (Salto de línea)' : `"${tok.lexeme}"`;
      const correctType = tok.type;
      const correctLabel = TOKEN_LABELS[correctType] || correctType;

      // Construir distractores inteligentes según el token
      const distractors = allTypes
        .filter((t) => t !== correctType)
        .sort((a, b) => {
          if (correctType === 'PRINT' && a === 'ID') return -1;
          if (correctType === 'ID' && (a === 'PRINT' || a === 'NUM')) return -1;
          if (correctType === 'ID' && (b === 'PRINT' || b === 'NUM')) return 1;
          if (correctType === 'NUM' && a === 'ID') return -1;
          return a.localeCompare(b);
        })
        .slice(0, 3);

      const rawOptions: MiniGameOption[] = [
        {
          id: correctType,
          label: correctLabel,
          isCorrect: true,
          wrongReason: '',
        },
        ...distractors.map((dType) => ({
          id: dType,
          label: TOKEN_LABELS[dType] || dType,
          isCorrect: false,
          wrongReason:
            correctType === 'PRINT' && dType === 'ID'
              ? `Clasificaste ${displayLexeme} como un identificador común (ID), pero 'print' es una palabra reservada del lenguaje MiniArit.`
              : correctType === 'ID' && dType === 'NUM'
              ? `Clasificaste ${displayLexeme} como número (NUM), pero comienza con letra y representa una variable.`
              : `Clasificaste el lexema ${displayLexeme} (línea ${tok.line}, col ${tok.col}) como ${dType}, lo cual no coincide con su categoría léxica.`,
        })),
      ];

      // Orden determinista por índice para evitar que siempre sea la primera opción
      const rotated = [...rawOptions.slice(idx % rawOptions.length), ...rawOptions.slice(0, idx % rawOptions.length)];

      return {
        id: `lex-${idx}`,
        stepTitle: `Token #${idx + 1} (Línea ${tok.line}, Col ${tok.col})`,
        prompt: `El escáner léxico lee el lexema ${displayLexeme}. ¿Qué tipo de Token debes emitir?`,
        contextCode: `Lexema actual: ${displayLexeme}  [Línea ${tok.line}, Columna ${tok.col}]`,
        correctActionExplain: `Para el lexema ${displayLexeme} el analizador léxico debe emitir el token ${correctLabel}.`,
        completedBadge: `${displayLexeme} → ${correctType}`,
        options: rotated,
      };
    });
  }

  // 2. FASE SINTÁCTICA: Construir los nodos del AST respetando la gramática y precedencia
  if (id === 'syntactic') {
    const ast = output.ast;
    const statements: any[] = ast?.statements || [];
    const challenges: MiniGameChallenge[] = [];

    statements.forEach((stmt, idx) => {
      const isAssign = stmt.kind === 'Assign';
      const stmtDesc = isAssign ? `sentencia de la línea ${stmt.span?.line || idx + 1} (${stmt.name} = ...)` : `sentencia print(...) de la línea ${stmt.span?.line || idx + 1}`;

      challenges.push({
        id: `syn-stmt-${idx}`,
        stepTitle: `Sentencia #${idx + 1} del AST`,
        prompt: `Analizando la ${stmtDesc}: ¿qué nodo raíz de sentencia debe crear el parser descendente recursivo?`,
        contextCode: isAssign ? `${stmt.name} = <expresión>` : `print(<expresión>)`,
        correctActionExplain: isAssign
          ? `Cuando la línea comienza con un identificador seguido de '=', la regla 'assign = ID "=" expr' construye un nodo AssignNode para '${stmt.name}'.`
          : `Cuando la línea comienza con la palabra reservada 'print', la regla 'print = "print" "(" expr ")"' construye un nodo PrintNode.`,
        completedBadge: isAssign ? `AssignNode(${stmt.name})` : `PrintNode()`,
        options: [
          {
            id: isAssign ? 'assign' : 'print',
            label: isAssign ? `AssignNode (Asignación a '${stmt.name}')` : 'PrintNode (Instrucción de salida)',
            isCorrect: true,
            wrongReason: '',
          },
          {
            id: isAssign ? 'print' : 'assign',
            label: isAssign ? 'PrintNode (Instrucción de salida)' : 'AssignNode (Asignación a variable)',
            isCorrect: false,
            wrongReason: isAssign
              ? `Elegiste PrintNode, pero la sentencia tiene la estructura 'ID = expr', no 'print(expr)'.`
              : `Elegiste AssignNode, pero la sentencia comienza con la palabra reservada 'print' y no modifica ninguna variable.`,
          },
          {
            id: 'binop',
            label: 'BinOpNode directo sin nodo de sentencia',
            isCorrect: false,
            wrongReason:
              'En la gramática de MiniArit toda línea del programa debe ser una sentencia (AssignNode o PrintNode), nunca una expresión suelta.',
          },
        ],
      });

      // Si la expresión interna es una operación binaria, agregar reto de precedencia/estructura
      const expr = stmt.expr;
      if (expr && expr.kind === 'BinOp') {
        const rootOp = expr.op;
        const hasRightBin = expr.right?.kind === 'BinOp';
        const rightOp = hasRightBin ? expr.right.op : null;

        challenges.push({
          id: `syn-expr-${idx}`,
          stepTitle: `Árbol de Expresión (Línea ${stmt.span?.line || idx + 1})`,
          prompt: hasRightBin
            ? `En la expresión compuesta de la línea ${stmt.span?.line || idx + 1}, hay operadores '${rootOp}' y '${rightOp}'. ¿Cuál debe quedar como nodo RAÍZ superior del subárbol y cuál se evalúa primero en las hojas?`
            : `Para la operación binaria con '${rootOp}', ¿cómo debe estructurar el parser el nodo BinOpNode?`,
          contextCode: hasRightBin
            ? `Operadores detectados: '${rootOp}' y '${rightOp}'`
            : `Operación binaria '${rootOp}'`,
          correctActionExplain: hasRightBin
            ? `Por precedencia de operadores, '${rightOp}' (nivel term/factor) se agrupa más profundo para evaluarse primero, dejando a '${rootOp}' como nodo raíz superior del árbol.`
            : `El parser construye BinOpNode('${rootOp}') con su operando izquierdo y derecho en niveles inferiores.`,
          completedBadge: `Árbol BinOp('${rootOp}')`,
          options: [
            {
              id: 'correct-tree',
              label: hasRightBin
                ? `Raíz '${rootOp}' arriba y subárbol '${rightOp}' anidado abajo (mayor precedencia)`
                : `Construir BinOpNode('${rootOp}') con hijos izquierdo y derecho`,
              isCorrect: true,
              wrongReason: '',
            },
            {
              id: 'wrong-prec',
              label: hasRightBin
                ? `Raíz '${rightOp}' arriba y '${rootOp}' abajo (evaluar '${rootOp}' primero)`
                : `Colocar los operandos como padres del operador '${rootOp}'`,
              isCorrect: false,
              wrongReason: hasRightBin
                ? `Invertiste la jerarquía del AST: en un árbol sintáctico, los nodos más profundos se evalúan primero. Si pones '${rootOp}' abajo, alterarías la precedencia aritmética.`
                : `En un AST los operadores son nodos internos y los operandos (números o variables) son sus hijos.`,
            },
          ],
        });
      }
    });

    return challenges;
  }

  // 3. FASE SEMÁNTICA: Tabla de Símbolos y Verificación de Declaraciones
  if (id === 'semantic') {
    const symbols: Array<{ name: string; type: string; line: number; uses: number }> =
      output.symbols || [];

    if (symbols.length === 0) {
      return [
        {
          id: 'sem-empty',
          stepTitle: 'Verificación de Tabla de Símbolos',
          prompt: 'El programa no declara variables en memoria. ¿Cuál es el dictamen del analizador semántico?',
          correctActionExplain: 'Sin variables declaradas ni referenciadas, la tabla de símbolos queda vacía y válida.',
          completedBadge: '0 variables, 0 errores',
          options: [
            {
              id: 'ok',
              label: 'Aprobar análisis semántico con 0 símbolos y 0 errores',
              isCorrect: true,
              wrongReason: '',
            },
            {
              id: 'err',
              label: 'Lanzar error semántico E-301 por tabla vacía',
              isCorrect: false,
              wrongReason: 'Un programa que solo imprime constantes numéricas es semánticamente válido.',
            },
          ],
        },
      ];
    }

    return symbols.map((sym, idx) => {
      const hasUses = sym.uses > 0;
      return {
        id: `sem-${sym.name}-${idx}`,
        stepTitle: `Símbolo '${sym.name}' (Declarado en línea ${sym.line})`,
        prompt: `Como analizador semántico, inspeccionas la variable '${sym.name}' (declarada en línea ${sym.line}, usada ${sym.uses} vez/veces). ¿Qué debes registrar en la Tabla de Símbolos?`,
        contextCode: `Variable: ${sym.name} | Línea declaración: ${sym.line} | Lecturas posteriores: ${sym.uses}`,
        correctActionExplain: hasUses
          ? `Debes registrar '${sym.name}' con tipo 'int' (32 bits), línea ${sym.line} y ${sym.uses} uso(s) válido(s) sin advertencias.`
          : `Debes registrar '${sym.name}' con tipo 'int' en línea ${sym.line} y emitir la advertencia W-301 porque tiene 0 usos posteriores.`,
        completedBadge: `${sym.name}: int (usos: ${sym.uses})${!hasUses ? ' [W-301]' : ''}`,
        options: [
          {
            id: 'correct',
            label: hasUses
              ? `Registrar '${sym.name}' (int, línea ${sym.line}, ${sym.uses} uso(s)) como válida`
              : `Registrar '${sym.name}' (0 usos) y emitir advertencia W-301 (variable sin usar)`,
            isCorrect: true,
            wrongReason: '',
          },
          {
            id: 'wrong-warn',
            label: hasUses
              ? `Emitir advertencia W-301 diciendo que '${sym.name}' nunca se usa`
              : `Marcar '${sym.name}' como usada múltiples veces sin advertencia`,
            isCorrect: false,
            wrongReason: hasUses
              ? `La variable '${sym.name}' sí es leída ${sym.uses} vez/veces en líneas posteriores, por lo que NO debe generar advertencia W-301.`
              : `La variable '${sym.name}' fue asignada pero nunca se leyó después; el compilador debe advertir código redundante con W-301.`,
          },
          {
            id: 'wrong-e301',
            label: `Rechazar '${sym.name}' con error fatal E-301 (variable no declarada)`,
            isCorrect: false,
            wrongReason: `'${sym.name}' fue correctamente asignada en la línea ${sym.line} antes de cualquier uso; E-301 solo ocurre cuando se lee una variable antes de asignarla.`,
          },
        ],
      };
    });
  }

  // 4. FASE CÓDIGO INTERMEDIO (TAC): Emitir las instrucciones en postorden
  if (id === 'ir') {
    const instrs: Array<{ index: number; text: string }> = output.instructions || [];
    return instrs.map((ins, idx) => {
      const nextInstr = instrs[idx + 1]?.text || 't99 = 0';
      const prevInstr = idx > 0 ? instrs[idx - 1].text : 't0 = 1 + 1';

      const rawOptions: MiniGameOption[] = [
        {
          id: 'correct',
          label: `Emitir [${idx}]: ${ins.text}`,
          isCorrect: true,
          wrongReason: '',
        },
        {
          id: 'premature',
          label:
            idx + 1 < instrs.length
              ? `Saltarse este paso y emitir primero: ${nextInstr}`
              : `Emitir asignación inversa: 0 = ${ins.text}`,
          isCorrect: false,
          wrongReason:
            idx + 1 < instrs.length
              ? `Intentaste emitir '${nextInstr}' antes de '${ins.text}'. El generador TAC recorre el AST en postorden: primero debe evaluar los hijos/temporales antes de usarlos.`
              : `En código de tres direcciones (TAC), el destino siempre va a la izquierda del '=' o después de 'print'.`,
        },
        {
          id: 'duplicate',
          label: `Re-emitir instrucción redundante: ${prevInstr}`,
          isCorrect: false,
          wrongReason: `Cada nodo del AST se traduce exactamente una vez en orden secuencial.`,
        },
      ];

      const rotated = [...rawOptions.slice(idx % rawOptions.length), ...rawOptions.slice(0, idx % rawOptions.length)];

      return {
        id: `ir-${idx}`,
        stepTitle: `Instrucción TAC [${idx}] de ${instrs.length}`,
        prompt: `Recorriendo el AST en postorden, ¿cuál es la instrucción #${idx + 1} de Código Intermedio (Tres Direcciones) que debes emitir ahora?`,
        contextCode:
          idx === 0
            ? 'Inicio de generación TAC (0 instrucciones emitidas)'
            : `Última instrucción emitida: [${idx - 1}] ${instrs[idx - 1].text}`,
        correctActionExplain: `En el paso #${idx + 1} del recorrido en postorden, corresponde emitir '${ins.text}'.`,
        completedBadge: `[${idx}] ${ins.text}`,
        options: rotated,
      };
    });
  }

  // 5. FASE OPTIMIZACIÓN: Aplicar pasadas y obtener el TAC reducido
  if (id === 'optimization') {
    const optInstrs: Array<{ index: number; text: string }> = output.instructions || [];
    const challenges: MiniGameChallenge[] = [];

    // Reto 1: Identificar el orden de pasadas del optimizador
    challenges.push({
      id: 'opt-passes',
      stepTitle: 'Pasadas de Optimización en Punto Fijo',
      prompt: 'Como optimizador de Hero-Compiler, ¿qué secuencia de pasadas debes aplicar sobre el código intermedio TAC?',
      contextCode: `Resumen esperado: ${phase.summary}`,
      correctActionExplain:
        'El optimizador aplica Propagación de Constantes → Plegado de Constantes (Constant Folding) → Propagación de Copias → Eliminación de Código Muerto (DCE).',
      completedBadge: 'Pasadas: Prop → Fold → DCE',
      options: [
        {
          id: 'correct-order',
          label: '1° Propagación de constantes, 2° Plegado aritmético (Folding) y 3° Eliminación de código muerto (DCE)',
          isCorrect: true,
          wrongReason: '',
        },
        {
          id: 'dce-first',
          label: 'Eliminar todas las variables al azar sin propagar ni plegar constantes',
          isCorrect: false,
          wrongReason:
            'Si eliminas variables antes de propagar sus constantes y plegar las operaciones, perderías los valores necesarios para calcular la salida.',
        },
      ],
    });

    // Reto 2+: Seleccionar cada instrucción resultante tras optimizar
    optInstrs.forEach((ins, idx) => {
      challenges.push({
        id: `opt-ins-${idx}`,
        stepTitle: `Resultado Optimizado [${idx}]`,
        prompt: `Tras plegar constantes y eliminar temporales muertos, ¿qué instrucción sobrevive en la posición [${idx}]?`,
        contextCode: `Instrucción optimizada #${idx + 1} de ${optInstrs.length}`,
        correctActionExplain: `Al evaluar las expresiones constantes en tiempo de compilación, la instrucción resultante es '${ins.text}'.`,
        completedBadge: `Opt [${idx}]: ${ins.text}`,
        options: [
          {
            id: 'correct',
            label: `${ins.text}`,
            isCorrect: true,
            wrongReason: '',
          },
          {
            id: 'unfolded',
            label: `t1 = t1 + 0 (conservar temporal muerto)`,
            isCorrect: false,
            wrongReason:
              'La pasada de Eliminación de Código Muerto (DCE) descarta los temporales intermedios que ya fueron plegados.',
          },
          {
            id: 'wrong-val',
            label: ins.text.startsWith('print ') ? 'print 0 (reiniciar acumulador)' : 'x = 0',
            isCorrect: false,
            wrongReason: `El plegado de constantes debe conservar el resultado aritmético exacto del programa (${ins.text}), no sustituirlo por 0.`,
          },
        ],
      });
    });

    return challenges;
  }

  // 6. FASE ENSAMBLADOR: Seleccionar las instrucciones ISA y registros R0..R7
  if (id === 'assembly') {
    const asmInstrs: Array<{ pc: number; text: string; fromIr?: number | null }> =
      output.instructions || [];

    return asmInstrs.map((ins, idx) => {
      const isHalt = ins.text === 'HALT';
      const isPrint = ins.text.startsWith('PRINT');
      const isLoadi = ins.text.startsWith('LOADI');

      const rawOptions: MiniGameOption[] = [
        {
          id: 'correct',
          label: `${ins.text}`,
          isCorrect: true,
          wrongReason: '',
        },
        {
          id: 'wrong-1',
          label: isHalt
            ? 'PRINT R7 (Seguir ejecutando indefinidamente)'
            : isPrint
            ? 'STORE [0], R0 (Guardar en memoria en vez de imprimir)'
            : isLoadi
            ? 'LOAD R0, [0] (Leer celda de memoria en vez de constante inmediata)'
            : 'HALT (Detener máquina antes de terminar)',
          isCorrect: false,
          wrongReason: isHalt
            ? 'Al finalizar todas las instrucciones del programa debes emitir HALT (0xFF) para detener el contador de programa (PC).'
            : isPrint
            ? 'Se requiere enviar el valor del registro a la salida estándar con PRINT, no guardarlo en memoria con STORE.'
            : isLoadi
            ? 'Confundiste LOAD con LOADI: LOAD lee una dirección de memoria [addr], mientras que LOADI carga un número constante inmediato en el registro.'
            : 'Emitir HALT aquí detendría la máquina virtual antes de completar las instrucciones restantes.',
        },
        {
          id: 'wrong-reg',
          label: 'Usar registro inexistente R9',
          isCorrect: false,
          wrongReason:
            'La arquitectura ISA de Hero-Compiler solo posee 8 registros numerados de R0 a R7. El registro R9 no existe en el hardware.',
        },
      ];

      const rotated = [...rawOptions.slice(idx % rawOptions.length), ...rawOptions.slice(0, idx % rawOptions.length)];

      return {
        id: `asm-${idx}`,
        stepTitle: `Ensamblador PC=${ins.pc}`,
        prompt:
          ins.fromIr !== null && ins.fromIr !== undefined
            ? `Traduciendo la instrucción TAC [${ins.fromIr}] en PC=${ins.pc}: ¿qué instrucción de máquina ISA debes emitir?`
            : `Para cerrar el programa en PC=${ins.pc}: ¿qué instrucción final debe emitir el ensamblador?`,
        contextCode: `Contador de Programa: PC = ${ins.pc}`,
        correctActionExplain: `En PC=${ins.pc} se debe emitir '${ins.text}' respetando la arquitectura de 8 registros (R0-R7).`,
        completedBadge: `PC=${ins.pc}: ${ins.text}`,
        options: rotated,
      };
    });
  }

  // 7. FASE BINARIO: Codificar cada instrucción en 8 bytes little-endian
  if (id === 'binary') {
    const rows: Array<{ offset: number; bytes: string; asm: string }> = output.rows || [];

    return rows.map((row, idx) => {
      const upperBytes = row.bytes.toUpperCase();
      const wrongOpcodeBytes = upperBytes.startsWith('02')
        ? '01' + upperBytes.slice(2)
        : upperBytes.startsWith('20')
        ? '03' + upperBytes.slice(2)
        : '00' + upperBytes.slice(2);

      const rawOptions: MiniGameOption[] = [
        {
          id: 'correct',
          label: `${upperBytes}  (Little-Endian 8B para ${row.asm})`,
          isCorrect: true,
          wrongReason: '',
        },
        {
          id: 'wrong-opcode',
          label: `${wrongOpcodeBytes}  (Opcode incorrecto en byte 0)`,
          isCorrect: false,
          wrongReason: `El primer byte (Byte 0) define el Opcode de '${row.asm}'. En la tabla ISA: LOAD=0x01, LOADI=0x02, STORE=0x03, ADD=0x10, SUB=0x11, MUL=0x12, NEG=0x13, PRINT=0x20, HALT=0xFF.`,
        },
        {
          id: 'wrong-size',
          label: `${upperBytes.slice(0, 11)}  (Trama truncada de 4 bytes)`,
          isCorrect: false,
          wrongReason:
            'En la arquitectura ISA de Hero-Compiler todas las instrucciones tienen un ancho fijo obligatorio de 8 bytes ([opcode, dst, src, 0x00, imm32]).',
        },
      ];

      const rotated = [...rawOptions.slice(idx % rawOptions.length), ...rawOptions.slice(0, idx % rawOptions.length)];

      return {
        id: `bin-${idx}`,
        stepTitle: `Codificación en Offset +0x${row.offset.toString(16).padStart(2, '0').toUpperCase()}`,
        prompt: `Codifica la instrucción ensamblador '${row.asm}' en su trama binaria de 8 bytes (formato [opcode, dst, src, 0x00, imm32 little-endian]):`,
        contextCode: `Instrucción: ${row.asm}  |  Offset: +${row.offset} bytes`,
        correctActionExplain: `La instrucción '${row.asm}' se codifica en 8 bytes little-endian como: ${upperBytes}.`,
        completedBadge: `+0x${row.offset.toString(16).padStart(2, '0').toUpperCase()}: ${upperBytes}`,
        options: rotated,
      };
    });
  }

  return [];
}

export const PhaseMiniGame: React.FC<PhaseMiniGameProps> = ({
  phase,
  onCompletePhase,
  onSyncStepIndex,
}) => {
  const challenges = useMemo(() => buildChallengesForPhase(phase), [phase]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedBadges, setCompletedBadges] = useState<string[]>([]);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [feedbackModal, setFeedbackModal] = useState<GameMistakeFeedback | null>(null);

  // Reiniciar el mini-juego cuando cambia la fase activa
  useEffect(() => {
    setCurrentIdx(0);
    setCompletedBadges([]);
    setMistakesCount(0);
    setFeedbackModal(null);
  }, [phase.id]);

  const isCompleted = challenges.length > 0 && currentIdx >= challenges.length;
  const currentChallenge = !isCompleted ? challenges[currentIdx] : null;

  const handleSelectOption = (opt: MiniGameOption) => {
    if (!currentChallenge) return;

    if (opt.isCorrect) {
      const nextBadges = [...completedBadges, currentChallenge.completedBadge];
      setCompletedBadges(nextBadges);
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (onSyncStepIndex && phase.steps.length > 0) {
        const mappedStep = Math.min(phase.steps.length - 1, nextIdx);
        onSyncStepIndex(mappedStep);
      }
    } else {
      setMistakesCount((m) => m + 1);
      setFeedbackModal({
        phaseName: phase.name,
        stepTitle: currentChallenge.stepTitle,
        userAnswer: opt.label,
        whatWentWrong: opt.wrongReason,
        whatShouldBeDone: currentChallenge.correctActionExplain,
      });
    }
  };

  if (challenges.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--muted)' }}>
        No hay retos interactivos para esta fase.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`Mini-juego de ${phase.name}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '18px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(37, 99, 235, 0.1))',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Cabecera del Mini-Juego */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Chip label="🎮 MODO HÉROE: TÚ ERES EL COMPILADOR" variant="green" />
          <strong style={{ color: 'var(--text-pure)', fontSize: '1rem' }}>
            Misión: {phase.name}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            Progreso: {Math.min(currentIdx, challenges.length)} / {challenges.length}
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
            Errores cometidos: {mistakesCount}
          </span>
        </div>
      </div>

      {/* Registro visual de lo que el usuario ya construyó en esta fase */}
      {completedBadges.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '10px 12px',
            backgroundColor: 'rgba(10, 20, 38, 0.6)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700 }}>
            ✓ Procesado por ti:
          </span>
          {completedBadges.map((b, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                color: '#FFFFFF',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Reto activo o Pantalla de Fase Superada */}
      {!isCompleted && currentChallenge ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
            backgroundColor: 'rgba(10, 20, 38, 0.78)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line-strong)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue-bright)', textTransform: 'uppercase' }}>
              Paso {currentIdx + 1} de {challenges.length} — {currentChallenge.stepTitle}
            </span>
          </div>

          {currentChallenge.contextCode && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-deep)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                color: 'var(--green)',
              }}
            >
              {currentChallenge.contextCode}
            </div>
          )}

          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-pure)', margin: 0 }}>
            {currentChallenge.prompt}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: '10px',
            }}
          >
            {currentChallenge.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(19, 36, 66, 0.85)',
                  border: '1px solid var(--line-strong)',
                  color: 'var(--text-pure)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '48px',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid var(--green)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              🏆 ¡Fase {phase.name} Completada por el Héroe!
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: '4px 0 0 0' }}>
              Ejecutaste todos los procesos de esta fase ({challenges.length} pasos completados, {mistakesCount} errores).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentIdx(0);
                setCompletedBadges([]);
                setMistakesCount(0);
              }}
            >
              Repetir Mini-Juego
            </Button>
            {onCompletePhase && (
              <Button variant="primary" size="sm" onClick={onCompletePhase}>
                Siguiente Fase del Compilador →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Ventana Modal cuando el usuario comete un error */}
      <ErrorFeedbackModal
        feedback={feedbackModal}
        onClose={() => setFeedbackModal(null)}
      />
    </div>
  );
};
