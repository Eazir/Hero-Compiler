# Hoja de ruta — Simulador de compilador (CompiLab)

Nov 10, 2026 · @David\_Tyr

## Visión, alcance y supuestos

CompiLab es un simulador que compila programas aritméticos de hasta 8 líneas y anima cada una de las 7 fases, desde los tokens hasta el binario. Se sustenta el viernes 27 de noviembre de 2026; el código vale 60% de la nota y la creatividad se evalúa. Hoy es martes 10: quedan 17 días.

**Alcance cerrado**

- Lenguaje MiniArit: enteros de 32 bits con signo, variables, `+`, `−`, `×`, paréntesis, menos unario y `print`.
- 7 fases: léxico, sintáctico, semántico, código intermedio, optimización, ensamblador y binario. El binario se ejecuta en una máquina virtual propia.
- 4 pantallas: editor de bloques, arena de compilación, resultado con consola y pantalla de error.
- Límites de carga: 8 líneas y 12 fragmentos por programa.

**Supuestos**

- Equipo de 3 personas (A, B y C) que trabajan en paralelo; el reparto está en el cronograma.
- El compilador se escribe a mano, sin generadores como ANTLR o PLY, para poder sustentar cada línea.
- El back no guarda estado ni usa base de datos; no hay login.
- Los mockups son la referencia visual. Sus números (por ejemplo "6 instrucciones, 24 bytes") son ilustrativos: la app los lee de la traza real.

**Pregunta abierta:** ¿el profesor exige una gramática formal en BNF o un número mínimo de fases? El plan de back ya incluye la gramática completa por si la piden.

## Arquitectura general

El back compila y registra una traza de cada fase; el front la reproduce paso a paso. Esa frontera permite trabajar en paralelo: mientras el back no existe, el front usa fixtures con el mismo formato.

**Decisiones técnicas clave**

1. **Back sin estado.** Cada compilación es una petición y la respuesta trae las 7 fases completas. El front puede retroceder o repetir una animación sin volver a llamar al servidor.
2. **Trazas como datos, no como animaciones.** El back dice qué pasó (operaciones con explicación y foco); el front decide cómo se ve.
3. **Los errores de compilación son datos.** Responden HTTP 200 con `ok: false` y un objeto `error`. Solo un fallo del servidor devuelve 5xx.
4. **Compilador escrito a mano.** Lexer por autómata y parser descendente recursivo: cada línea se puede explicar en la sustentación.
5. **VM propia.** El binario se ejecuta de verdad; la consola no muestra un resultado calculado por separado.
6. **Contrato versionado.** Esquema v1 con pydantic en el back y zod en el front, ambos validados contra las mismas fixtures.

## Contrato de datos entre back y front

Un solo endpoint, `POST /api/compile`, devuelve todo lo que el front necesita. Los errores de compilación no son errores HTTP: llegan como datos con `ok: false`.

| Endpoint | Se entrega en | Uso |
| --- | --- | --- |
| `GET /api/health` | F0 | Comprobar que el back está vivo |
| `POST /api/compile` | F0 (fixtures), F1–F5 (real) | Compila y devuelve trazas, binario y salida |
| `GET /api/examples` | F6 | Programas de ejemplo, válidos y con error |
| `POST /api/mutate` | F8 | Devuelve una variante del programa con un bug inyectado |

**Reglas del contrato v1**

- `phases` siempre trae las 7 fases en este orden: `lexical`, `syntactic`, `semantic`, `ir`, `optimization`, `assembly`, `binary`.
- El `status` de cada fase es `ok`, `error` o `skipped` (las posteriores a un error).
- Cada fase trae `steps`. Cada paso trae `title`, `explain` (el porqué, en español), `focus` (qué resaltar) y `ops` (qué cambió).
- Si `ok` es `false`, `error` trae `code`, `kind`, `message`, `why`, `hint`, `span`, `stepIndex` y `fixes`.
- Cualquier cambio al esquema después de F0 exige actualizar las fixtures y avisar a los tres.

Forma de la respuesta para `c = a + b * 2` (recortada):

```json
{
  "version": 1,
  "ok": true,
  "phases": [
    { "id": "lexical", "status": "ok",
      "steps": [ { "title": "Leer 'c'", "ops": [ { "op": "token", "type": "ID", "lexeme": "c", "line": 3, "col": 1 } ] } ],
      "output": { "tokens": [ "…" ] } },
    { "id": "syntactic", "status": "ok", "steps": [ "…" ], "output": { "ast": { "…": "…" } } }
  ],
  "executable": { "hex": "02 00 00 00 0b 00 00 00 …", "size": 24 },
  "run": { "stdout": ["11"], "exitCode": 0 },
  "error": null
}
```

El detalle de cada operación y el catálogo de errores están en el plan de back; los tipos zod equivalentes, en el plan de front.

## Mapa de fases en orden de ejecución

Once fases (F0–F10) ordenadas por necesidad: primero lo que desbloquea el trabajo en paralelo, luego el flujo principal de punta a punta, después errores, resultado y creatividad, y al final calidad y ensayo. Cada fila termina con algo que se puede demostrar. Persona A = back núcleo, B = back de generación y ejecución, C = front (el reparto está más abajo).

| Fase | Back | Front | Depende de | Demo al cerrar |
| --- | --- | --- | --- | --- |
| F0 Fundación y contrato | A/B: esqueleto FastAPI, esquema v1, fixtures | C: Vite + React + TS, cliente zod, mocks | Nada | El front dibuja una fixture servida por el back |
| F1 Léxico y shell | A: lexer y errores E-1xx | C: layout, navegación, tokens CSS, PhaseStepper | F0 | `a = 5` da 3 tokens en pantalla |
| F2 Sintáctico y editor | A: parser, AST, errores E-2xx | C: bloques drag and drop, serializador, límites | F1 | Se arma un programa con bloques y se ve su AST |
| F3 Semántico y arena base | A: tabla de símbolos, E-301 | C: reproductor de pasos, panel explicativo, vista de tokens | F2 | Las fases 1–3 se reproducen con el botón Continuar |
| F4 Intermedio y optimización | B: código de 3 direcciones, 4 pasadas | A: vistas de AST y de símbolos | F3 | `c = a + b * 2` se optimiza a `print 11` |
| F5 Ensamblador, binario y VM | B: registros, ISA, codificador, VM | C: vistas de intermedio, optimización, ensamblador y hex | F4 | Las 7 fases corren de punta a punta |
| F6 Errores completos | A: catálogo E-1xx a E-5xx, fixes, ejemplos | C: pantalla de error y animación del fallo | F5 | Un error semántico se explica y se corrige |
| F7 Resultado y consola | B: traza de ejecución y límites | C: escritorio, doble clic, consola | F5 | `programa.exe` imprime `11` en la consola |
| F8 Creatividad (recortable) | A/B: `/api/mutate` | C: predicciones, XP, modo detective | F6, F7 | Se inyecta un bug y se predice en qué fase falla |
| F9 Calidad y empaquetado | A/B: límites, cobertura, `run.sh` | C: E2E, accesibilidad, rendimiento | F7 | Un comando levanta todo y los E2E pasan |
| F10 Congelamiento y ensayo | Todos | Todos | F9 | Demo cronometrada sin internet |

**Ruta crítica:** F0 → F1 → F2 → F3 → F4 → F5 → F6 y F7 → F9 → F10. F8 es la única fase que se puede recortar sin perder ninguna de las 4 pantallas.

## Detalle de fases F0–F5

Cada fase tiene necesidades, requisitos, criterios de aceptación (casillas para marcar) y pruebas. Una fase se cierra solo cuando todas sus casillas están marcadas y CI está en verde.

### F0 · Fundación y contrato (10–11 nov)

**Necesidades.** Que los tres trabajen en paralelo desde el día 2 sin esperar al compilador.

**Requisitos**

- Monorepo `compilab/` con `backend/`, `frontend/` y `contract/`.
- Esquema JSON v1 (pydantic en el back, zod en el front) acordado y congelado.
- Tres fixtures: programa válido, error semántico y error sintáctico.
- `POST /api/compile` devuelve las fixtures mientras no hay compilador.
- CI con pytest, ruff, mypy, vitest, tsc y eslint; README con los comandos.

**Criterios de aceptación**

- [ ] `GET /api/health` responde 200.
- [ ] El front dibuja la fixture válida sin errores de validación de zod.
- [ ] La misma fixture valida contra pydantic y contra zod.
- [ ] CI en verde sobre `main` y tag `contract-v1` creado.

**Pruebas.** Test de esquema de cada fixture contra pydantic, test de contrato de cada fixture contra zod y smoke test del endpoint con `TestClient`.

### F1 · Léxico y shell de la app (11–13 nov)

**Necesidades.** La primera fase real de punta a punta y la base visual común.

**Requisitos**

- Back (A): lexer a mano para `NUM`, `ID`, `print`, `=`, `+`, `-`, `*`, paréntesis y fin de línea; un paso de traza por token; errores E-101, E-102 y E-103 con línea y columna.
- Front (C): layout con navegación entre las 4 pantallas, tokens CSS, componentes base y `PhaseStepper`; cliente de API real con respaldo a mocks.

**Criterios de aceptación**

- [ ] `a = 5` produce 3 tokens con tipo y posición correctos.
- [ ] `a = @` devuelve E-101 en la línea 1, columna 5.
- [ ] La navegación entre pantallas no recarga la página.
- [ ] `PhaseStepper` muestra las 7 fases y distingue la activa, las completas y las bloqueadas.

**Pruebas.** pytest parametrizado con 15 casos o más (entrada → tokens); un caso pytest por cada error léxico con su posición; pruebas de componente del stepper con Testing Library.

### F2 · Sintáctico y editor de bloques (13–15 nov)

**Necesidades.** La entrada interactiva del usuario y el árbol sintáctico.

**Requisitos**

- Back (A): parser descendente recursivo de la gramática, AST con ids de nodo, un paso por regla aplicada y errores E-201 a E-205 que dicen qué se esperaba y qué llegó.
- Front (C): paleta de fragmentos, arrastrar y soltar con anidado, límites de 12 fragmentos y 8 líneas, serializador de bloques a texto con paréntesis solo cuando hacen falta, vista previa del código y botón Compilar.

**Criterios de aceptación**

- [ ] `a + b * 2` produce el árbol `+(a, *(b, 2))`.
- [ ] `(a + b) * 2` conserva sus paréntesis al pasar de bloques a texto.
- [ ] `c = + 2` devuelve E-201 en la línea 1, columna 5.
- [ ] El fragmento 13 no se puede soltar y el usuario ve el motivo.
- [ ] Todo el flujo se puede hacer con teclado (seleccionar fragmento y pulsar Enter para insertarlo).

**Pruebas.** pytest: expresión → AST esperado (formato s-expression) y un caso por cada error E-2xx. Vitest: serializador con tabla de casos y modelo de bloques (límite de fragmentos). El E2E de "armar un programa" queda para F9.

## Detalle de fases F6–F10

### F6 · Errores completos (21–22 nov)

**Necesidades.** Que cada error se explique solo y que el usuario vea en la animación dónde y por qué ocurre.

**Requisitos**

- Back (A): catálogo E-1xx a E-5xx completo; cada error con `code`, `kind`, `phase`, `message`, `why`, `hint`, `span`, `stepIndex` y `fixes`; la fase del error termina con un paso `fail` y las siguientes quedan `skipped`; `GET /api/examples` con 6 programas (3 válidos y 3 con error).
- Front (C): pantalla de error con tarjeta (código, mensaje, por qué, cómo arreglarlo), animación del fallo en la arena (la fase se pone roja, las siguientes se bloquean y el punto exacto se resalta) y botones que aplican el `fix` al programa de bloques y vuelven a compilar.

**Criterios de aceptación**

- [ ] Cada código del catálogo tiene al menos una prueba que lo dispara.
- [ ] La animación se detiene en el `stepIndex` del error.
- [ ] Aplicar el fix "Agregar d = 4 antes de la línea 3" modifica los bloques y el programa compila.
- [ ] Ningún error de compilación produce HTTP 500.

**Pruebas.** pytest parametrizado por código del catálogo (fuente → error esperado con línea y columna) y una prueba de API por tipo de error. Vitest y Testing Library: `ErrorScreen` pinta `why`, `hint` y `fixes` desde una fixture. E2E ligero: programa con error → pantalla de error → aplicar fix → compila.

### F7 · Resultado y consola (22–23 nov)

**Necesidades.** Cerrar el ciclo: ver el ejecutable y comprobar que hace lo esperado.

**Requisitos**

- Back (B): `run` con `stdout`, `exitCode` y una traza de ejecución instrucción por instrucción (`pc`, instrucción y registros), limitada a 1000 pasos.
- Front (C): escritorio simulado con los iconos `programa.exe`, `programa.asm` y `programa.cl`; doble clic (o Enter con foco) sobre el ejecutable abre una consola simulada que escribe la salida; panel de resumen con tokens, instrucciones, bytes y tiempo; botones "Ver el binario" y "Escribir otro programa".

**Criterios de aceptación**

- [ ] Doble clic y Enter abren la consola.
- [ ] La salida de la consola coincide exactamente con `run.stdout`.
- [ ] Los números del resumen salen de la traza, no de texto fijo.
- [ ] Un programa sin `print` muestra "programa terminó con código 0".

**Pruebas.** pytest: `run` devuelve la salida esperada, el código de salida y respeta el límite de pasos. Testing Library: doble clic abre la consola con la salida de la fixture; accesibilidad: el icono es un `button` con nombre y la consola es un `log`.

## Cronograma y reparto del equipo

El plan cubre del 10 al 27 de noviembre de 2026. Una fase se cierra solo con todas sus casillas marcadas y el congelamiento de código es el miércoles 25.

**Reparto**

| Persona | Rol | Fases que lidera |
| --- | --- | --- |
| A | Back núcleo y, después, vistas de AST en el front | F1 léxico, F2 parser, F3 semántico, F4 vistas de AST y símbolos, F6 catálogo de errores, F8 mutaciones |
| B | Back de generación y ejecución | F0 API y contrato, F4 intermedio y optimización, F5 ensamblador, binario y VM, F7 ejecución, F9 hardening |
| C | Front | F0 front, F1 shell, F2 editor, F3 reproductor, F5 vistas, F6 pantalla de error, F7 resultado, F8 juego, F9 E2E |

**Reglas de trabajo**

- Ramas cortas por fase (`f2-parser`, `f3-reproductor`) y PR revisado por otra persona.
- Reunión de 15 minutos al cierre de cada fase para mostrar la columna "Demo al cerrar" del mapa de fases.
- Si una fase se atrasa más de un día, se recorta F8 antes que cualquier otra cosa.
- Cada persona tiene un respaldo: A respalda a B, B a C y C a A.

## Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Front y back se desincronizan por cambios al contrato | Media | Alto | Contrato v1 congelado en F0, fixtures compartidas y pruebas de contrato en ambos lados |
| El parser tiene errores de precedencia o asociatividad | Media | Alto | Pruebas de AST con s-expressions y de propiedades; revisión cruzada entre A y B |
| Las animaciones se vuelven demasiado pesadas | Media | Medio | Límite de 8 líneas y 12 fragmentos, máximo 200 pasos por fase, solo `transform` y `opacity`, botón de saltar |
| Alcance excesivo (juego y extras) | Alta | Alto | F8 es recortable y no empieza si F6 o F7 tienen casillas sin marcar |
| Una persona se bloquea o no está disponible | Media | Alto | Respaldo asignado por fase, README por fase y PR revisados por otra persona |
| El profesor pregunta teoría que el equipo no domina | Media | Alto | Ficha de una página por fase en F10 y ensayo de preguntas |
| Falla internet o el equipo el día de la sustentación | Baja | Alto | Build local sin internet, fuentes locales, video de respaldo y los 6 ejemplos precargados |
| Los números de los mockups no coinciden con la traza real | Alta | Bajo | La app muestra siempre datos de la traza; los mockups son solo referencia visual |

## Definición de terminado y checklist para la sustentación

El proyecto está terminado cuando se cumple todo lo siguiente.

**Funcional**

- [ ] Las 4 pantallas funcionan de punta a punta con el programa de ejemplo `c = a + b * 2`.
- [ ] Las 7 fases se animan y se pueden pausar, retroceder y saltar.
- [ ] Todos los errores del catálogo se explican en la pantalla de error y se ven en la animación.
- [ ] El binario se ejecuta en la VM y la consola muestra la salida real.

**Calidad**

- [ ] CI en verde: pytest, ruff, mypy, vitest, tsc, eslint y los 4 E2E.
- [ ] Cobertura de `compiler/` de al menos 90%.
- [ ] axe sin violaciones críticas en las 4 pantallas.
- [ ] Un solo comando (`run.sh`) levanta todo sin internet.

**Sustentación**

- [ ] Guion de demo de 8 a 10 minutos ensayado dos veces.
- [ ] Cada integrante explica su fase en 2 minutos.
- [ ] Video de respaldo y fichas de teoría listos.
- [ ] Tag `v1.0-sustentacion` creado el miércoles 25.

### F3 · Semántico y arena base (15–17 nov)

**Necesidades.** Detectar errores de significado y construir el corazón de la experiencia: el reproductor paso a paso.

**Requisitos**

- Back (A): tabla de símbolos (nombre, tipo entero, línea de definición, usos), verificación de definición antes de uso (E-301), advertencia W-301 por variable no usada y un paso por línea.
- Front (C): `PhasePlayer` (reproducir, pausar, paso adelante y atrás, velocidad 0.5×, 1× y 2×, barra de progreso), panel "¿Qué pasa y por qué?", botón Continuar bloqueado hasta terminar la animación (con opción de saltarla) y vista animada de los tokens.

**Criterios de aceptación**

- [ ] `a = d + 1` devuelve E-301 en la línea 1, columna 5.
- [ ] `a = 5` seguido de `print(1)` produce W-301 sobre `a` y no detiene la compilación.
- [ ] Retroceder y avanzar deja exactamente el mismo estado visual en un mismo paso.
- [ ] Continuar solo se activa al terminar la fase o al saltar la animación.
- [ ] Teclado: espacio reproduce o pausa; flecha izquierda y derecha cambian de paso.

**Pruebas.** pytest: definir, redefinir, usar antes de definir y variable no usada. Vitest: el reductor del reproductor como función pura y `usePlayer` con timers falsos. Testing Library: estado del botón Continuar.

### F4 · Código intermedio y optimización (17–19 nov)

**Necesidades.** Pasar del árbol a instrucciones simples y mostrar por qué el programa se puede achicar sin cambiar su resultado.

**Requisitos**

- Back (B): generador de código de tres direcciones con temporales (`t1`, `t2`…) y cuatro pasadas de optimización (plegado de constantes, propagación de constantes, propagación de copias y eliminación de código muerto), cada una con sus pasos y su cuenta de cambios; opción `optimize: false`.
- Front (A): vista del AST (layout con d3-hierarchy, nodos que aparecen según los `ops`, arista activa resaltada) y vista de la tabla de símbolos (consulta animada).

**Criterios de aceptación**

- [ ] El intermedio de `c = a + b * 2` es `t1 = b * 2`, `t2 = a + t1`, `c = t2`.
- [ ] Con `a = 5`, `b = 3` y `optimize: true`, el programa completo queda en `print 11`.
- [ ] Con `optimize: false` se conservan las 6 instrucciones.
- [ ] El AST se anima nodo por nodo y coincide con el JSON de la fase.

**Pruebas.** pytest: archivos golden de intermedio y optimización para 10 programas; propiedad: el optimizador no cambia la salida. Vitest: el layout del árbol no solapa nodos y el estado de cada nodo se deduce de los `ops` hasta el paso i.

### F5 · Ensamblador, binario y VM (19–21 nov)

**Necesidades.** Llegar al binario y demostrar que funciona ejecutándolo.

**Requisitos**

- Back (B): asignación de registros R0–R7, las 9 instrucciones de la ISA, codificador a bytes (8 bytes por instrucción), VM que ejecuta los bytes y devuelve la salida, errores aritméticos E-401 y E-402 y límites E-502 y E-503.
- Front (C): vistas de intermedio y optimización (antes y después, con diff), ensamblador (cada línea del intermedio con sus instrucciones) y binario (rejilla hex con cada byte ligado a su instrucción).

**Criterios de aceptación**

- [ ] `print(11)` se codifica en 24 bytes y decodifica a `LOADI R0, 11`, `PRINT R0` y `HALT`.
- [ ] `a = 100000 * 100000` da E-401 con `optimize: true` y E-402 con `optimize: false`.
- [ ] Ejecutar el binario de `c = a + b * 2` imprime `11`.
- [ ] Pasar el cursor sobre un byte resalta su instrucción y su línea del intermedio.

**Pruebas.** pytest: codificar y decodificar sin pérdida (propiedad con hypothesis) y equivalencia entre la VM y un intérprete del intermedio sobre 200 programas generados. Vitest: la rejilla hex asocia cada byte con su instrucción.

### F8 · Creatividad: predicción, modo detective y progreso (23–24 nov, recortable)

**Necesidades.** Convertir la herramienta en una experiencia de juego sin perder rigor técnico. Es la parte que más pesa en la nota de creatividad. **Regla de corte:** F8 no empieza si F6 o F7 tienen casillas sin marcar.

**Requisitos**

- Back (A/B): `POST /api/mutate` recibe un programa y un `kind` (`lexical`, `syntactic`, `semantic` o `arithmetic`) y devuelve una variante con un bug inyectado de ese tipo, determinista con una semilla.
- Front (C): preguntas de predicción en 3 puntos (qué se calcula primero, cuántas instrucciones quedan tras optimizar y qué imprimirá el programa) calculadas desde la traza; XP, nivel y logros guardados en `localStorage`; modo detective (inyectar un bug, adivinar en qué fase falla y comprobarlo); selector Aprender, Reto o Sin juego.

**Criterios de aceptación**

- [ ] Cada variante de `/api/mutate` falla con un error del tipo pedido.
- [ ] Las preguntas se calculan desde la traza: cambian si cambia el programa.
- [ ] Sin `localStorage` la app funciona igual, solo que no guarda el progreso.
- [ ] En modo "Sin juego" desaparecen XP, logros y preguntas.

**Pruebas.** pytest: para cada `kind`, `mutate` produce un programa que falla con un error de ese tipo y la misma semilla da la misma variante. Vitest: reductor de XP, generación de preguntas desde la fixture y comportamiento sin `localStorage`.

### F9 · Calidad y empaquetado (24–25 nov)

**Necesidades.** Que nada falle el día de la sustentación.

**Requisitos**

- E2E de Playwright para el flujo feliz, el error semántico con su corrección, el error aritmético y el interruptor de optimización.
- Accesibilidad: teclado completo, contraste AA, `aria-live` en las explicaciones, `prefers-reduced-motion` y revisión con axe.
- Rendimiento: solo `transform` y `opacity` en las animaciones, layout del AST calculado una vez y carga diferida de la arena.
- Back: límites de tamaño y de pasos, CORS, límite de peticiones y cobertura del compilador de al menos 90%.
- Empaquetado: el build del front lo sirve FastAPI, para correr todo en un solo proceso; scripts `run.sh` y `run.bat`; README con arquitectura, comandos y decisiones.

**Criterios de aceptación**

- [ ] Los 4 E2E pasan en CI.
- [ ] axe no reporta violaciones críticas en las 4 pantallas.
- [ ] `./run.sh` levanta todo en un equipo limpio en menos de 5 minutos y la app funciona después sin internet.
- [ ] La cobertura de `compiler/` es de al menos 90%.

**Pruebas.** `pytest --cov=compilab.compiler --cov-fail-under=90`, Playwright con `@axe-core/playwright` y una pasada manual con Lighthouse (rendimiento y accesibilidad).

### F10 · Congelamiento, ensayo y sustentación (25–27 nov)

**Necesidades.** Llegar al viernes con una demo ensayada y con cada integrante capaz de explicar el código.

**Requisitos**

- Congelamiento de código el miércoles 25: desde ahí solo se corrigen errores.
- Guion de demo de 8 a 10 minutos: ejemplo válido con optimización, error semántico con su corrección, error aritmético, binario y consola, arquitectura (qué hace el back y qué el front) y la parte de creatividad.
- Cada integrante prepara una ficha de una página con la teoría de sus fases (qué problema resuelve, el algoritmo y un ejemplo) para las preguntas del profesor.
- Plan B: video de la demo, build local que corre sin internet y los 6 ejemplos precargados.
- Tag `v1.0-sustentacion` y repositorio limpio.

**Criterios de aceptación**

- [ ] Dos ensayos completos cronometrados; el último, sin tocar el código.
- [ ] Cada integrante explica su fase en 2 minutos sin apoyo.
- [ ] La demo corre sin internet.
- [ ] Existen el video de respaldo y las fichas, impresas o abiertas.

**Pruebas.** Lista de verificación de 10 minutos antes de entrar: levantar con `run.sh`, compilar los 6 ejemplos y comprobar que cada uno devuelve el resultado que declara, y revisar las 4 pantallas con el proyector.
