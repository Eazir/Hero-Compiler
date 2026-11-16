# Plan de acción Front — CompiLab (React)

Nov 10, 2026 · @David\_Tyr

## Stack, convenciones y herramientas

El front es una SPA en React 18 + Vite + TypeScript que no compila nada: recibe del back una traza por fase y la anima. Cada herramienta está elegida para que esa animación sea determinista y accesible.

| Herramienta | Uso | Por qué |
| --- | --- | --- |
| React 18 + Vite | SPA y build | Arranque rápido y recarga en caliente |
| TypeScript (strict) | Tipos del contrato | Detecta desajustes con el back al compilar |
| Zustand | Estado global | 4 stores pequeños, sin boilerplate |
| Framer Motion | Animaciones | Declarativas y controlables desde el estado |
| @dnd-kit/core | Arrastrar y soltar | Accesible por teclado; no usa la API HTML5 de DnD |
| d3-hierarchy | Solo el layout del AST | Calcula posiciones; React dibuja |
| zod | Validar respuestas | Rechaza una traza inválida con un mensaje claro |
| MSW | Mock del API | Permite trabajar sin back en F0–F2 |
| Vitest + Testing Library | Pruebas unitarias y de componente | Misma configuración que Vite |
| Playwright | E2E y capturas | Cubre los 4 flujos de la sustentación |
| ESLint + Prettier | Estilo | Se verifica en CI |

**Convenciones**

- Una visualización es una función pura de (salida de la fase, pasos hasta el índice i). No tiene efectos ni timers propios.
- El único reloj de la app es `usePlayer`. Ningún componente usa `setTimeout` por su cuenta.
- Código en inglés; textos de la interfaz en español, centralizados en `src/i18n/es.ts`.
- Un componente no pasa de 200 líneas; la lógica vive en `domain/` y no importa React.
- Cada fase se cierra con un PR revisado por otra persona y con CI en verde.

Si el equipo prefiere JavaScript, zod se mantiene igual: se pierde el chequeo de tipos, pero el contrato se sigue validando en ejecución.

## Arquitectura de componentes

Todas las pantallas leen la misma traza del store y dibujan una función pura de ella. Ninguna visualización pide datos al back: si el usuario retrocede, el render es idéntico.

**Flujo de datos**

1. El **editor** guarda el programa como bloques (`Program`) en `useProgramStore`.
2. `toSource(program)` genera el texto y un mapa de posiciones (`sourceMap`).
3. `compile(source)` llama a `POST /api/compile`, valida con zod y guarda la traza en `useCompileStore`.
4. La **arena** crea un `usePlayer(phase)` por fase y entrega a cada visualización `(output, steps, stepIndex)`.
5. Al terminar la fase 7, **resultado** lee `run` y `executable` del mismo store. Si hay `error`, la **pantalla de error** lo lee de ahí.

```text
frontend/src/
  api/          client.ts, schema.ts (zod), mocks/ (MSW)
  domain/       blocks.ts, serialize.ts, sourceMap.ts, phases.ts, predictions.ts
  state/        programStore.ts, compileStore.ts, playerStore.ts, gameStore.ts
  features/
    editor/     Palette, BlockCanvas, CodePreview, FragmentCounter
    arena/      PhaseStepper, PhasePlayer, ExplainPanel, views/
                  TokensView, AstView, SymbolsView, IrView, OptView, AsmView, HexView
    result/     Desktop, FileIcon, Console, Summary
    error/      ErrorScreen, ErrorCard, FixButtons
    game/       PredictionPrompt, XpBar, Achievements, DetectiveMode
  ui/           Button, Panel, Chip, Block, Toast, Tooltip
  i18n/         es.ts
  styles/       tokens.css
contract/       fixtures/*.json   (compartido con el back)
```

| Capa | Puede importar | No puede importar |
| --- | --- | --- |
| `domain/` | Nada de React | `state/`, `features/` |
| `state/` | `domain/`, `api/` | `features/` |
| `features/` | `ui/`, `state/`, `domain/` | Otras `features/` (se comunican por el store) |
| `ui/` | Solo estilos | Todo lo demás |

## Sistema de diseño y tokens

Los mockups ya fijan el look: interfaz oscura tipo laboratorio con tipografía técnica. Los tokens viven en `styles/tokens.css` como variables CSS y ningún componente usa un color suelto.

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0F1424` | Fondo de la app |
| `--panel` | `#161C30` | Paneles y editor |
| `--panel-2` | `#1C2440` | Tarjetas y controles |
| `--line` | `#2A3358` | Bordes |
| `--text` | `#E8ECF8` | Texto principal |
| `--muted` | `#A3AFD1` | Texto secundario |
| `--amber` | `#FFB84D` | Acción principal, fase activa, operaciones |
| `--cyan` | `#5ED4E8` | Nodos construidos, variables |
| `--violet` | `#A78BFA` | Números, logros |
| `--green` | `#5EE0A0` | Éxito y `print` |
| `--red` | `#FF6F7D` | Errores |

**Fuentes:** Space Grotesk para la interfaz y JetBrains Mono para código, tokens y hex.

**Color por tipo de bloque** (igual en editor, tokens y AST): variable = cian, número = violeta, operación = ámbar, asignación = azul, print = verde.

**Componentes base de `ui/`:** `Button` (primario, secundario, peligro), `Panel`, `Chip`, `Block` (pieza de código por tipo), `Toast`, `Tooltip` y `ProgressBar`.

**Reglas**

- Contraste mínimo AA (4.5:1 para texto) y objetivos táctiles de 44 px o más.
- El color nunca es el único indicador: el error lleva ícono y texto, no solo rojo.
- Tres duraciones de movimiento: 200 ms (hover), 400 ms (aparece un nodo) y 800 ms (un paso del reproductor a 1×). Con `prefers-reduced-motion` todas bajan a 0 ms y los pasos avanzan solo con el botón.
- Solo se animan `transform` y `opacity`.

## Estado global y consumo del contrato

Son cuatro stores pequeños de Zustand y solo el de juego se persiste.

| Store | Contiene | Persistencia |
| --- | --- | --- |
| `useProgramStore` | `Program` (bloques), historial para deshacer, contador de fragmentos | No |
| `useCompileStore` | `status` (`idle`, `loading`, `done`, `failed`), `trace` (respuesta validada) y error de red | No |
| `usePlayerStore` | Por fase: `step`, `playing`, `speed`, `finished`; además `phase` y fases desbloqueadas | No |
| `useGameStore` | XP, nivel, logros y modo (`aprender`, `reto`, `sin juego`) | `localStorage` con try/catch |

**Modelo de bloques** (`domain/blocks.ts`):

```ts
export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; operand: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*'; left: Expr; right: Expr };

export type Stmt =
  | { kind: 'assign'; name: string; expr: Expr }
  | { kind: 'print'; expr: Expr };

export type Program = Stmt[];
```

`toSource(program)` devuelve `{ text, sourceMap }`. El `sourceMap` relaciona cada rango (línea, columna, largo) con la ruta del bloque que lo produjo, de modo que un error del back se marca sobre el bloque exacto.

**Cliente de API** (`api/client.ts`). Valida siempre con zod: una respuesta inválida se vuelve un error visible, no una pantalla en blanco.

```ts
export async function compile(source: string, optimize = true): Promise<CompileResponse> {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, optimize }),
  });
  if (!res.ok) throw new ApiError('SERVER', `El servidor respondió ${res.status}`);
  const parsed = CompileResponse.safeParse(await res.json());
  if (!parsed.success) throw new ApiError('CONTRACT', 'La respuesta no cumple el contrato v1', parsed.error);
  return parsed.data;
}
```

**Mocks.** MSW responde con las fixtures de `contract/fixtures/` según un diccionario texto → fixture. Así el front funciona sin back hasta F5 y los E2E corren sin red.

**Seguridad del render.** La traza se trata como datos no confiables: ningún texto del back se inserta como HTML, y ESLint prohíbe `dangerouslySetInnerHTML`.

## Fases FE-0 a FE-4

Cada FE-n corresponde a la fase Fn de la hoja de ruta y se cierra cuando sus casillas están marcadas y CI está en verde.

### FE-0 · Fundación (10–11 nov)

**Necesidades.** Trabajar contra el contrato sin esperar al back.

**Requisitos**

- Proyecto Vite + React + TypeScript estricto, con ESLint, Prettier, Vitest, Testing Library y Playwright configurados.
- `api/schema.ts` con los esquemas zod del contrato v1 (fase, paso, operación, error y ejecución).
- `api/client.ts` con validación y errores tipados (`SERVER`, `CONTRACT`, `NETWORK`).
- MSW con las 3 fixtures de `contract/fixtures/`.
- Una página temporal que lista las fases de la fixture.

**Criterios de aceptación**

- [ ] `npm run dev` muestra los nombres de las 7 fases tomados de la fixture.
- [ ] `npm test`, `npm run lint` y `tsc --noEmit` pasan.
- [ ] Una respuesta inválida muestra un mensaje de error, no una pantalla en blanco.

**Pruebas**

```ts
import okBasic from '../../../contract/fixtures/ok_basic.json';
import { CompileResponse } from './schema';

test('la fixture válida cumple el contrato', () => {
  expect(() => CompileResponse.parse(okBasic)).not.toThrow();
});

test('rechaza una respuesta sin fases', () => {
  const bad = { ...okBasic, phases: undefined };
  expect(CompileResponse.safeParse(bad).success).toBe(false);
});

test('el cliente convierte una respuesta inválida en ApiError CONTRACT', async () => {
  server.use(http.post('/api/compile', () => HttpResponse.json({ ok: true })));
  await expect(compile('a = 5')).rejects.toMatchObject({ code: 'CONTRACT' });
});
```

### FE-1 · Shell y sistema de diseño (11–13 nov)

**Necesidades.** Una base visual y de navegación que no haya que rehacer.

**Requisitos**

- `react-router` con 4 rutas (`/`, `/arena`, `/resultado`, `/error`) y un guardia: sin traza no se entra a la arena.
- `styles/tokens.css` con los tokens de la sección de diseño y las dos fuentes.
- Componentes de `ui/`: `Button`, `Panel`, `Chip`, `Block`, `Toast`, `Tooltip` y `ProgressBar`.
- `PhaseStepper` con los estados `done`, `active`, `locked` y `error`.
- Barra superior con navegación y estado de la compilación.

**Criterios de aceptación**

- [ ] Navegar entre pantallas no recarga la página y conserva el programa.
- [ ] `/arena` sin traza redirige a `/` con un aviso.
- [ ] Todos los controles tienen foco visible y un orden de tabulación lógico.
- [ ] El stepper marca la fase activa con `aria-current="step"`.

**Pruebas**

```tsx
test('el stepper marca activa, completa y bloqueada', () => {
  render(<PhaseStepper phases={PHASES} active="syntactic" done={['lexical']} />);
  expect(screen.getByText('Sintáctico').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('Léxico').closest('li')).toHaveAttribute('data-state', 'done');
  expect(screen.getByText('Semántico').closest('li')).toHaveAttribute('data-state', 'locked');
});

test('la arena sin traza redirige al editor', () => {
  renderWithRouter(<App />, { route: '/arena', trace: null });
  expect(screen.getByRole('heading', { name: /editor/i })).toBeInTheDocument();
});
```

### FE-2 · Editor de bloques ampliado (Hero-Compiler) (13–15 nov)

**Necesidades.** Que armar programas simples o robustos sea rápido, claro, visualmente despejado y difícil de romper.

**Requisitos**

- Paleta con fragmentos: variable, número, suma, resta, multiplicación, negación unaria (`-x`), asignación y print, más misiones predefinidas y modo de edición de código libre.
- Arrastrar y soltar y acciones rápidas por nodo (envolver en operación, invertir operandos, simplificar) y por línea (mover arriba/abajo, duplicar, alternar asignación/print).
- Recuadro de edición numérica despejado (`type="text" inputMode="numeric"`, sin barras/flechas de spinner que oculten los dígitos y con ancho adaptable holgado).
- Límites ampliados a **36 fragmentos** y **20 líneas** para permitir programas más robustos, con contador y mensaje cuando se alcanzan.
- `toSource(program)` con paréntesis mínimos y `sourceMap`; vista previa del código en tiempo real.
- Deshacer, limpiar y cargar ejemplo/misiones.

**Criterios de aceptación**

- [ ] `(a + b) * 2` y `a - (b - 1)` se serializan con sus paréntesis; `a + b * 2` no lleva ninguno.
- [ ] El fragmento 13 se rechaza con un mensaje y el contador no pasa de 12.
- [ ] Un error del back en la línea 3, columna 9 se marca sobre el bloque correcto.
- [ ] El flujo completo se puede hacer con teclado.

**Pruebas**

```ts
const cases: [Program, string][] = [
  [[assign('c', bin('+', v('a'), bin('*', v('b'), n(2))))], 'c = a + b * 2'],
  [[assign('c', bin('*', bin('+', v('a'), v('b')), n(2)))], 'c = (a + b) * 2'],
  [[assign('c', bin('-', v('a'), bin('-', v('b'), n(1))))], 'c = a - (b - 1)'],
  [[print(neg(v('a')))], 'print(-a)'],
];
test.each(cases)('serializa el caso %#', (program, text) => {
  expect(toSource(program).text).toBe(text);
});

test('rechaza el fragmento 13', () => {
  expect(canAdd(programWithFragments(12), 'num')).toEqual({ ok: false, reason: 'MAX_FRAGMENTS' });
});

test('el sourceMap ubica la variable d de la línea 3', () => {
  // a = 5 / b = 3 / c = a + d * 2
  const { sourceMap } = toSource(programWithUndefinedD);
  expect(pathAt(sourceMap, { line: 3, col: 9 })).toEqual([2, 'expr', 'right', 'left']);
});
```

## Fases FE-5 a FE-9

### FE-5 · Vistas de intermedio, optimización, ensamblador y binario (19–21 nov)

**Necesidades.** Que se vea cómo se achica el programa y la correspondencia entre una instrucción, sus bytes y su línea original.

**Requisitos**

- `IrView`: lista de instrucciones que aparecen con `emit`; cada una enlaza con su nodo del AST (`fromNode`) y lo resalta.
- `OptView`: vista antes y después con una pasada por paso; las instrucciones eliminadas se tachan, las plegadas muestran el valor nuevo con una transición; contador de instrucciones antes y después; interruptor "ver sin optimizar" que recompila con `optimize: false`.
- `AsmView`: cada instrucción del intermedio con las instrucciones de máquina que produjo (`fromIr`) y los registros asignados.
- `HexView`: rejilla de filas de 8 bytes, una por instrucción, con `offset`, bytes y mnemónico; al pasar el cursor o enfocar un byte se resalta su fila, su línea de ensamblador y su línea del intermedio.

**Criterios de aceptación**

- [ ] Todas las vistas se pintan solo con `output` y `steps`, sin cálculos propios del compilador.
- [ ] El contador antes/después coincide con los `instructions` de cada fase.
- [ ] Tocar un byte resalta su instrucción en las tres vistas.
- [ ] Alternar "sin optimizar" cambia la cantidad de filas de `HexView`.

**Pruebas**

```ts
test('instructionAtOffset ubica el byte en su fila', () => {
  expect(instructionAtOffset(fixtureBinary.rows, 9)?.asm).toBe('PRINT R0');
});

test('al enfocar un byte se resaltan su instrucción y su línea de intermedio', async () => {
  const user = userEvent.setup();
  render(<BinaryArena phase={fixtureBinary} asm={fixtureAsm} ir={fixtureIr} />);
  await user.hover(screen.getByTestId('byte-9'));
  expect(screen.getByText('PRINT R0').closest('li')).toHaveAttribute('data-active', 'true');
  expect(screen.getByText('print 11').closest('li')).toHaveAttribute('data-active', 'true');
});

test('el diff marca las instrucciones eliminadas', () => {
  render(<OptView phase={fixtureOpt} stepIndex={fixtureOpt.steps.length - 1} />);
  expect(screen.getAllByTestId('ir-removed')).toHaveLength(5); // 6 antes, 1 después
});
```

### FE-6 · Pantalla de error y animación del fallo (21–22 nov)

**Necesidades.** Que el error sea una experiencia explicativa y no un cartel rojo.

**Requisitos**

- `ErrorScreen` con tarjeta: código, tipo, línea y columna; `message`; "¿Por qué ocurre?" (`why`); "¿Cómo arreglarlo?" (`hint` y `fixes`).
- En la arena, `failAt(phase, stepIndex)`: la fase se pone en rojo, `focus.span` se resalta con subrayado ondulado y las fases siguientes pasan a `locked`.
- Errores semánticos: `SymbolsView` muestra la búsqueda fallida. Sintácticos: `AstView` deja el nodo incompleto con el token inesperado. Aritméticos: `OptView` o la consola muestran la operación y el valor que se salió del rango.
- `applyFix(program, fix)` en `domain/fixes.ts` para `insert_assignment` y `replace_variable`, y luego recompila.
- El bloque culpable se marca en el editor con `sourceMap`.

**Criterios de aceptación**

- [ ] Un error E-3xx lleva la animación hasta `stepIndex` y se detiene allí.
- [ ] Aplicar un fix modifica los bloques, recompila y, si compila, lleva a la arena.
- [ ] El error se anuncia a lectores de pantalla (`role="alert"`).
- [ ] No depende solo del rojo: lleva ícono, código y texto.

**Pruebas**

```ts
test('insert_assignment agrega la asignación antes de la línea indicada', () => {
  const next = applyFix(programWithUndefinedD, {
    kind: 'insert_assignment', name: 'd', value: 4, beforeLine: 3,
  });
  expect(toSource(next).text).toBe('a = 5\nb = 3\nd = 4\nc = a + d * 2');
});

test('replace_variable cambia solo esa línea', () => {
  const next = applyFix(programWithUndefinedD, {
    kind: 'replace_variable', line: 3, from: 'd', to: 'a',
  });
  expect(toSource(next).text.split('\n')[2]).toBe('c = a + a * 2');
});

test('ErrorScreen muestra por qué, pista y arreglos', () => {
  render(<ErrorScreen error={errSemantic.error} />);
  expect(screen.getByRole('alert')).toHaveTextContent('E-301');
  expect(screen.getByText(/¿Por qué ocurre\?/)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /agregar|cambiar/i })).toHaveLength(2);
});
```

## Estrategia de pruebas del front

La pirámide tiene muchas pruebas rápidas sobre lógica pura, algunas de componente y pocos E2E.

| Nivel | Qué cubre | Herramienta | Meta |
| --- | --- | --- | --- |
| Unitarias | `domain/` y `state/`: serializador, límites, reductor del reproductor, `nodeStates`, `layoutTree`, `applyFix`, predicciones | Vitest | 90% de líneas en `domain/` |
| Contrato | Cada fixture de `contract/fixtures/` contra los esquemas zod | Vitest | 100% de las fixtures |
| Componente | `PhaseStepper`, `PhasePlayer`, `SymbolsView`, `HexView`, `ErrorScreen`, `Console` | Testing Library + user-event | Una prueba por criterio de aceptación de cada vista |
| E2E | 4 flujos de la sustentación contra el back real | Playwright | 4 de 4 en verde |
| Visual | Las 4 pantallas | `toHaveScreenshot` | Sin diferencias mayores a 1% |
| Accesibilidad | Las 4 pantallas | axe | Cero violaciones críticas o serias |

**Reglas**

- Una visualización se prueba con `(output, steps, stepIndex)` tomados de una fixture, sin red ni timers.
- Los timers se prueban con `vi.useFakeTimers()`; ninguna prueba espera tiempo real.
- Cada criterio de aceptación de este plan tiene al menos una prueba que lo nombra en su título.
- Comandos: `npm test` (unitarias y de componente), `npm run test:e2e` (Playwright), `npm run lint` y `npx tsc --noEmit`.

## Rendimiento y accesibilidad

**Rendimiento**

- Bundle inicial de 250 KB o menos de JS comprimido, con `React.lazy` para la arena y el resultado.
- Las animaciones usan solo `transform` y `opacity`; no se animan `width`, `top` ni `left`.
- `layoutTree` se calcula una vez por AST (`useMemo`) y las vistas reciben posiciones ya calculadas.
- Las vistas van envueltas en `React.memo` y reciben solo `(output, steps, stepIndex)`.
- Con 8 líneas y 200 pasos por fase como máximo no hace falta virtualizar listas.

**Accesibilidad**

- Todo el flujo se hace con teclado. Atajos: espacio (reproducir o pausar), flechas (paso anterior o siguiente), Enter (ejecutar o insertar un fragmento) y Esc (cerrar la consola).
- El panel "¿Qué pasa y por qué?" usa `aria-live="polite"` y los errores usan `role="alert"`.
- Contraste mínimo AA y objetivos de 44 px. El color nunca es el único indicador.
- Con `prefers-reduced-motion` no hay reproducción automática, las transiciones duran 0 ms y la consola muestra la salida de golpe.
- Foco visible en todos los controles; al cerrar la consola el foco vuelve al icono.
- Los nodos del AST y las filas de la tabla llevan `aria-label` con su estado, por ejemplo "nodo + construido".

**Verificación.** Lighthouse manual en las 4 pantallas antes del congelamiento, con meta de 90 o más en accesibilidad y 80 o más en rendimiento.

### FE-3 · Reproductor y arena base (15–17 nov)

**Necesidades.** Que el usuario controle el ritmo y entienda cada paso. Todas las visualizaciones dependen de esta pieza.

**Requisitos**

- `playerReducer(state, action)` puro, con las acciones `PLAY`, `PAUSE`, `NEXT`, `PREV`, `SEEK`, `SPEED` y `FINISH`.
- `usePlayer(stepCount)` con un único reloj: 800 ms por paso a 1×, 1600 ms a 0.5× y 400 ms a 2×.
- `PhasePlayer` con controles, barra de progreso y atajos de teclado (espacio y flechas).
- `ExplainPanel`, que muestra `title` y `explain` del paso actual con `aria-live="polite"`.
- Botón Continuar bloqueado hasta terminar la fase y botón "Saltar animación" que lleva al último paso.
- `TokensView`: los tokens salen de la línea de código y entran a una tira, según los `ops` de tipo `token`.

**Criterios de aceptación**

- [ ] Un mismo `step` produce siempre el mismo render, avanzando o retrocediendo.
- [ ] El reproductor se detiene solo en el último paso y marca la fase como terminada.
- [ ] Continuar se activa al terminar o al saltar la animación, y desbloquea la fase siguiente en el stepper.
- [ ] Con `prefers-reduced-motion` no hay reproducción automática.

**Pruebas**

```ts
test('NEXT no pasa del último paso y marca la fase terminada', () => {
  let s = initPlayer({ stepCount: 3 });
  for (let i = 0; i < 3; i++) s = playerReducer(s, { type: 'NEXT' });
  expect(s.step).toBe(2);
  expect(s.finished).toBe(true);
});

test('PREV en el primer paso se queda en 0', () => {
  const s = playerReducer(initPlayer({ stepCount: 3 }), { type: 'PREV' });
  expect(s.step).toBe(0);
});

test('a 1× avanza un paso cada 800 ms', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => usePlayer(5));
  act(() => result.current.play());
  act(() => { vi.advanceTimersByTime(800); });
  expect(result.current.step).toBe(1);
});

test('Continuar está deshabilitado hasta terminar', async () => {
  render(<PhasePlayer phase={lexicalPhase} onContinue={vi.fn()} />);
  expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /saltar animación/i }));
  expect(screen.getByRole('button', { name: /continuar/i })).toBeEnabled();
});
```

### FE-4 · Vistas del AST y de la tabla de símbolos (17–19 nov)

**Necesidades.** Mostrar cómo se construye el árbol y cómo se consulta la tabla, que son las dos fases más difíciles de entender.

**Requisitos**

- `layoutTree(ast)` con `d3.hierarchy` y `d3.tree().nodeSize(...)`, que devuelve coordenadas por id de nodo.
- `nodeStates(steps, i)` calcula `done`, `building` o `pending` de cada nodo a partir de los `ops` hasta el paso i.
- `AstView` dibuja nodos y aristas con los estados y colores del diseño; los nodos pendientes se ven punteados.
- `SymbolsView`: tabla con filas que aparecen con `declare`; una consulta (`lookup`) resalta la fila encontrada o muestra "no existe en la tabla" en rojo.
- Resaltado cruzado: el paso activo marca en el código fuente los tokens que lo producen (`focus.span`).

**Criterios de aceptación**

- [ ] El árbol de `c = a + b * 2` se anima nodo por nodo y sus 7 nodos coinciden con el JSON.
- [ ] Ningún par de nodos se solapa en programas de hasta 15 nodos.
- [ ] La consulta de una variable inexistente deja la fila roja y la animación se detiene en ese paso.
- [ ] El layout se calcula una vez por AST, no en cada paso.

**Pruebas**

```ts
// Los ids (n5, n7…) son los de la fixture ok_basic.json
test('el layout no solapa nodos', () => {
  const pos = [...layoutTree(fixtureAst).values()];
  for (let i = 0; i < pos.length; i++)
    for (let j = i + 1; j < pos.length; j++)
      expect(Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y)).toBeGreaterThan(48);
});

test('el estado de cada nodo sale de los ops hasta el paso i', () => {
  const states = nodeStates(fixtureSyntacticSteps, 4);
  expect(states['n5']).toBe('building'); // el nodo * de b * 2
  expect(states['n7']).toBe('pending');  // el literal 2
});

test('un lookup fallido deja la fila en rojo', () => {
  render(<SymbolsView phase={errSemanticPhase} stepIndex={3} />);
  expect(screen.getByText(/no existe en la tabla/i).closest('tr')).toHaveAttribute('data-state', 'missing');
});
```

### FE-7 · Resultado y consola (22–23 nov)

**Necesidades.** Cerrar el recorrido con el ejecutable y su salida.

**Requisitos**

- `Desktop` con fondo, iconos (`FileIcon` como `button`) para `programa.exe`, `programa.asm` y `programa.cl`, y barra de tareas.
- Doble clic (o Enter con foco, o el botón "Ejecutar") sobre `programa.exe` abre `Console` (`role="log"`).
- `Console` escribe `run.stdout` línea por línea con efecto de escritura (instantáneo con `prefers-reduced-motion`) y termina con "programa terminó con código N".
- `Summary` con tokens, instrucciones, bytes y tiempo, tomados de la traza.
- Botones "Ver el binario" (abre `HexView`) y "Escribir otro programa" (limpia el estado y vuelve al editor).
- Si existe `run.error` (E-402 o E-503), la consola muestra el error en rojo y no un código de salida 0.

**Criterios de aceptación**

- [ ] El texto de la consola coincide con `run.stdout`, línea por línea.
- [ ] Los números del resumen cambian si cambia el programa.
- [ ] Un programa sin `print` muestra solo la línea de cierre.
- [ ] Todo se puede hacer con teclado.

**Pruebas**

```tsx
test('doble clic en programa.exe abre la consola con la salida', async () => {
  const user = userEvent.setup();
  render(<ResultScreen trace={okTrace} />, { reducedMotion: true });
  await user.dblClick(screen.getByRole('button', { name: /programa\.exe/i }));
  const log = await screen.findByRole('log');
  expect(log).toHaveTextContent('11');
  expect(log).toHaveTextContent(/terminó con código 0/);
});

test('Enter también ejecuta', async () => {
  const user = userEvent.setup();
  render(<ResultScreen trace={okTrace} />, { reducedMotion: true });
  screen.getByRole('button', { name: /programa\.exe/i }).focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('log')).toBeInTheDocument();
});

test('el resumen sale de la traza', () => {
  render(<Summary trace={okTrace} />);
  expect(screen.getByTestId('summary-bytes')).toHaveTextContent(String(okTrace.executable.size));
});
```

### FE-8 · Creatividad Hero-Compiler: 6 Mini-Juegos Arcade (Fases 1–6) y Escritorio/Consola en Fase 7

**Necesidades.** Que el usuario viva el proceso interno de las primeras 6 fases del compilador mediante mini-juegos arcade verdaderos y que en la Fase 7 (Binario) inspeccione el binario y ejecute el programa en un escritorio virtual con consola.

**Requisitos**

- **Fases 1 a 6 con Mini-Juegos Arcade interactivos** y **Ventana Modal de Diagnóstico (`ErrorFeedbackModal`)** que ante cualquier fallo explica qué error se cometió y qué se debió hacer:
  1. `lexical` — **🚀 Space Lexer (Navecitas y Disparos)**: Nave controlada en un lienzo espacial que cambia entre 4 cañones de frecuencia (`ID`, `NUM`, `OP/ASSIGN`, `PRINT/NEWLINE`) y dispara proyectiles a los meteoritos con los lexemas del programa.
  2. `syntactic` — **🕸️ AST Constellation (Conectar Puntos)**: Lienzo estelar interactivo donde el usuario conecta puntos/nodos padres con sus hijos respetando la jerarquía y precedencia de operadores (`*` antes que `+`/`-`).
  3. `semantic` — **🧭 Symbol Maze (Laberinto de Memoria)**: Laberinto en cuadrícula donde el jugador mueve un dron (`↑` `↓` `←` `→` o clic) para recoger las llaves de declaración de variables antes de abrir las puertas donde dichas variables son leídas.
  4. `ir` — **🎯 Post-Order Sniper (Tiro al Blanco)**: Campo de tiro con mira telescópica y dianas en movimiento donde el usuario debe disparar a las instrucciones TAC en estricto orden de recorrido postorden.
  5. `optimization` — **🛡️ Optimizer Tower Defense (Defensa en Cinta Transportadora)**: Las instrucciones TAC avanzan por un carril hacia el núcleo de la CPU y el usuario activa 3 torretas (Propagación Azul, Plegado/Folding Verde y Destructor de Código Muerto Rojo).
  6. `assembly` — **⚡ Register Switchboard (Tablero de Cableado a Registros `R0`–`R7`)**: Panel electrónico donde se tienden cables desde cada operando hacia los chips de registro `R0`–`R7` y se pulsa la compuerta del opcode ISA.
- **Fase 7 (`binary`) SIN mini-juego — 🖥️ Escritorio Virtual + Ejecutable + Consola**:
  - Muestra directamente la rejilla hexadecimal de 8 bytes (`HexView`) junto con el **Escritorio Virtual (`VirtualDesktop`)** que presenta los iconos del binario (`programa.bin`), ensamblador (`programa.asm`) y el ejecutable (`programa.exe`).
  - Al hacer clic en `programa.exe` y ejecutarlo, se abre la ventana de **Consola (`Console`)** que simula la terminal del sistema operativo e imprime en vivo la salida de la ejecución en la VM (`stdout`, registros y código de salida).

**Criterios de aceptación**

- [ ] Las preguntas cambian cuando cambia el programa.
- [ ] Una respuesta incorrecta nunca resta XP.
- [ ] Sin `localStorage` la app funciona y solo se pierde el progreso.
- [ ] "Sin juego" oculta XP, logros y preguntas.

**Pruebas**

```ts
test('la pregunta de precedencia sale de la traza', () => {
  const q = precedenceQuestion(okTrace);
  expect(q.correct).toBe('b * 2');
  expect(q.options).toContain('a + b');
});

test('una respuesta correcta suma 20 XP y una incorrecta no resta', () => {
  const store = createGameStore();
  store.getState().answer({ correct: true });
  store.getState().answer({ correct: false });
  expect(store.getState().xp).toBe(20);
});

test('sin localStorage la tienda no lanza', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  const store = createGameStore();
  expect(() => store.getState().answer({ correct: true })).not.toThrow();
  expect(store.getState().xp).toBe(20);
});
```

### FE-9 · Calidad, accesibilidad y empaquetado (24–25 nov)

**Necesidades.** Que la demo funcione siempre y en cualquier equipo.

**Requisitos**

- 4 E2E de Playwright contra el back real: flujo feliz, error semántico con fix, error aritmético e interruptor de optimización.
- Capturas de las 4 pantallas con `toHaveScreenshot` para detectar regresiones visuales.
- axe en las 4 pantallas, navegación completa por teclado y `prefers-reduced-motion`.
- `npm run build` genera `dist/`, que FastAPI sirve como archivos estáticos.
- Carga diferida (`React.lazy`) de la arena y del resultado; presupuesto de 250 KB de JS comprimido en la carga inicial.
- Fuentes servidas localmente (`@fontsource`), para que la demo funcione sin internet.

**Criterios de aceptación**

- [ ] Los 4 E2E pasan en CI.
- [ ] axe no reporta violaciones críticas ni serias.
- [ ] El build pasa sin errores de tipos y el bundle inicial respeta el presupuesto.
- [ ] La app funciona sin conexión a internet.

**Pruebas**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('flujo feliz: bloques → arena → resultado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /cargar ejemplo/i }).click();
  await page.getByRole('button', { name: /^compilar/i }).click();
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: /saltar animación/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();
  }
  await page.getByRole('button', { name: /programa\.exe/i }).dblclick();
  await expect(page.getByRole('log')).toContainText('11');
});

test('error semántico: se explica y se corrige', async ({ page }) => {
  await page.goto('/');
  await loadExample(page, 'variable sin declarar');
  await page.getByRole('button', { name: /^compilar/i }).click();
  await expect(page.getByRole('alert')).toContainText('E-301');
  await page.getByRole('button', { name: /agregar d = 4/i }).click();
  await expect(page).toHaveURL(/arena/);
});

for (const ruta of ['/', '/arena', '/resultado', '/error']) {
  test(`axe sin violaciones críticas en ${ruta}`, async ({ page }) => {
    await seedState(page, ruta);
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
}
```
