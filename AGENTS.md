# AGENTS.md — CompiLab

Simulador interactivo de un compilador aritmético. El usuario arma un programa con bloques, el back lo compila en 7 fases y el front anima cada fase hasta el binario. Proyecto universitario; sustentación el viernes 27 de noviembre de 2026.

Lee este archivo completo antes de tocar código. Si algo aquí contradice una petición directa del usuario, gana el usuario.

## Estructura del repositorio

```text
compilab/
  AGENTS.md
  contract/fixtures/      # JSON compartidos por back y front (fuente de verdad del contrato)
  backend/                # Python 3.11, FastAPI
    compilab/
      api/                # main.py, routes.py, limits.py
      contract/models.py  # modelos pydantic del contrato
      compiler/           # errors, tracer, lexer, parser, semantic, ir, optimizer,
                          # assembler, encoder, vm, pipeline
    tests/                # unit/ golden/ property/ api/ contract/
  frontend/               # React 18 + Vite + TypeScript estricto
    src/
      api/                # client.ts, schema.ts (zod), mocks/ (MSW)
      domain/             # blocks, serialize, sourceMap, fixes, predictions (sin React)
      state/              # stores de Zustand
      features/           # editor, arena, result, error, game
      ui/                 # componentes base
      i18n/es.ts          # textos de la interfaz
      styles/tokens.css
  run.sh / run.bat
```

## Comandos

Back (desde `backend/`):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn compilab.api.main:app --reload        # http://localhost:8000/docs
pytest -q
pytest --cov=compilab.compiler --cov-fail-under=90
ruff check . && mypy compilab
```

Front (desde `frontend/`):

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest + Testing Library
npm run test:e2e       # Playwright (requiere el back levantado)
npm run lint && npx tsc --noEmit
npm run build
```

Todo junto: `./run.sh` (o `run.bat`).

Antes de dar una tarea por terminada, corre los comandos de lint, tipos y pruebas del lado que tocaste. Si tocaste el contrato, corre los dos lados.

## El lenguaje (MiniArit)

- Una instrucción por línea. Enteros de 32 bits con signo.
- Sentencias: `x = expr` y `print(expr)`.
- Operadores: `+`, `-`, `*`, menos unario y paréntesis. `*` tiene más precedencia; todo asocia por la izquierda.
- Una variable debe asignarse en una línea anterior antes de usarse.
- Límites: 8 líneas, 400 caracteres, 12 fragmentos en el editor.

```ebnf
program   = { statement } ;
statement = ( assign | print ) NEWLINE ;
assign    = ID "=" expr ;
print     = "print" "(" expr ")" ;
expr      = term { ( "+" | "-" ) term } ;
term      = factor { "*" factor } ;
factor    = NUM | ID | "(" expr ")" | "-" factor ;
```

## Fases del compilador

`lexical` → `syntactic` → `semantic` → `ir` → `optimization` → `assembly` → `binary`, y luego la VM ejecuta el binario. Cada fase es una función pura `run(entrada, tracer) -> salida`.

Máquina objetivo: 8 registros (`R0`–`R7`), instrucciones de 8 bytes little-endian (`opcode, dst, src, reservado, imm32`). Opcodes: `LOAD 0x01`, `LOADI 0x02`, `STORE 0x03`, `ADD 0x10`, `SUB 0x11`, `MUL 0x12`, `NEG 0x13`, `PRINT 0x20`, `HALT 0xFF`.

Caso de referencia: `a = 5`, `b = 3`, `c = a + b * 2`, `print(c)` produce 6 instrucciones intermedias, queda en `print 11` al optimizar y se codifica en 24 bytes. Úsalo como ejemplo en pruebas y fixtures.

## Contrato back–front (esquema v1)

- `POST /api/compile` recibe `{ source, optimize }` y devuelve `{ version, ok, phases[7], executable, run, error, meta }`.
- Los errores de compilación son datos: HTTP 200 con `ok: false`. Solo un fallo inesperado devuelve 5xx (E-599).
- `phases` siempre trae las 7 fases en orden; `status` es `ok`, `error` o `skipped`.
- Cada fase trae `steps` con `title`, `explain`, `focus` y `ops`. El back dice qué pasó; el front decide cómo se ve.
- Catálogo de errores: E-1xx léxicos, E-2xx sintácticos, E-3xx semánticos, E-4xx aritméticos, E-5xx límites, E-599 interno. W-301 es una advertencia.
- Los `fixes` de un error son operaciones estructuradas (`insert_assignment`, `replace_variable`), no parches de texto.
- Cambiar el esquema obliga a: actualizar `models.py`, `schema.ts` y las fixtures de `contract/fixtures/`, y avisar al equipo. No lo hagas sin que el usuario lo pida.

## Convenciones del back

- Sin librerías de compilación (PLY, ANTLR, Lark). Lexer y parser escritos a mano.
- Los errores de compilación son excepciones `CompileError(code, message, span, ...)`; el pipeline las convierte en datos. Nunca uses códigos HTTP para ellos.
- Tokens, nodos e instrucciones son `@dataclass(frozen=True)`.
- Posiciones 1-based (línea y columna).
- Nunca `eval`, `exec` ni `subprocess` con datos del usuario.
- No registres el código fuente en logs: solo longitud y hash.

## Convenciones del front

- Una visualización es una función pura de `(output, steps, stepIndex)`. Sin efectos ni timers propios.
- El único reloj de la app es `usePlayer`. Prohibido `setTimeout` suelto en componentes.
- `domain/` no importa React; `ui/` no importa nada de la app; las `features/` no se importan entre sí (se comunican por el store).
- Validar siempre la respuesta del back con zod. Nunca usar `dangerouslySetInnerHTML` con texto de la traza.
- Textos de la interfaz en español dentro de `src/i18n/es.ts`; código en inglés.
- Estilos con variables de `tokens.css`; ningún color suelto. Animar solo `transform` y `opacity`.
- Accesibilidad obligatoria: teclado completo, `aria-live="polite"` en las explicaciones, `role="alert"` en errores, objetivos de 44 px, `prefers-reduced-motion`.
- `localStorage` siempre dentro de `try/catch`; la app debe funcionar sin él.

## Pruebas

- Cada criterio de aceptación de las fases tiene al menos una prueba que lo nombra en su título.
- Back: pytest parametrizado por fase, golden files en `tests/golden/` (se actualizan solo con `--update-golden` y revisión), propiedades con hypothesis (codificar/decodificar sin pérdida; optimizar no cambia la salida) y pruebas de API con `TestClient`.
- Front: Vitest para `domain/` y `state/`, Testing Library para componentes, Playwright para los 4 flujos (feliz, error semántico, error aritmético, alternar optimización) y axe en las 4 pantallas.
- Los timers se prueban con `vi.useFakeTimers()`. Ninguna prueba espera tiempo real ni depende de la red.
- Metas: cobertura de `compilab/compiler` ≥ 90% y de `domain/` ≥ 90%.

## Flujo de trabajo

1. Trabaja por fases (F0–F10, ver la hoja de ruta). No empieces una fase si la anterior tiene criterios sin cumplir.
2. Una rama por fase (`f2-parser`, `f3-reproductor`) y PR revisado por otra persona.
3. Escribe primero la prueba del criterio de aceptación; luego la implementación.
4. F8 (juego, predicciones, modo detective) es recortable: no se empieza si F6 o F7 tienen casillas sin marcar.
5. Congelamiento de código: miércoles 25 de noviembre. Después solo se corrigen errores.

Mensajes de commit en español, en imperativo y con el prefijo de la fase: `F2: parser descendente recursivo con AST`.

## Reglas para agentes

- Haz el cambio mínimo que cumpla la tarea. No refactorices ni cambies estilo de archivos que no tocas.
- No agregues dependencias sin que el usuario lo apruebe; prefiere la librería estándar.
- No modifiques `contract/fixtures/`, el esquema ni los golden files salvo que la tarea lo pida.
- No inventes números de la traza (instrucciones, bytes, tiempos): la interfaz los lee de la respuesta del back.
- Los mockups son referencia visual. Sus cifras (por ejemplo "6 instrucciones, 24 bytes") son ilustrativas.
- Si algo no está definido en este archivo ni en los planes, pregunta antes de decidir.
- Nunca subas secretos, `.env` ni archivos generados (`dist/`, `.venv/`, `node_modules/`).

## Documentación del proyecto

Tres documentos definen el alcance: la hoja de ruta (fases F0–F10 con requisitos, criterios de aceptación y pruebas), el plan de front (FE-0 a FE-9) y el plan de back (BE-0 a BE-9). Ante una duda de alcance, mandan ellos.
