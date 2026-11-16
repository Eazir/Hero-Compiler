# Hero-Compiler (CompiLab)

> **Simulador interactivo, gamificado y de alta precisión de un compilador aritmético (`MiniArit`) paso a paso en 7 fases, con generación de código máquina y ejecución en máquina virtual de 64 bits.**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

---

## 📌 Contexto del Proyecto

**Hero-Compiler** es una plataforma pedagógica y visual diseñada para estudiantes y desarrolladores que desean comprender las entrañas de los compiladores modernos. En lugar de tratar la compilación como una caja negra, el sistema desglosa todo el proceso en **7 fases canónicas**, permitiendo interactuar con los datos estructurales del compilador (tokens, árboles sintácticos, tablas de símbolos, código de tres direcciones, optimizaciones algebraicas, código ensamblador y binarios little-endian).

El proyecto incorpora un **Modo Arcade Hero**, donde cada fase de compilación se traduce en un reto interactivo con mecánicas arcade que simulan las decisiones del compilador. Si el usuario comete un error (como invertir la precedencia de operadores o intentar leer una variable sin declarar), el simulador despliega un diagnóstico pedagógico detallando el error cometido y la solución requerida según las normas del compilador.

---

## 📐 El Lenguaje MiniArit

El compilador procesa programas escritos en **MiniArit**, un lenguaje aritmético determinista con tipado entero de 32 bits con signo:

- **Instrucciones:** Una instrucción por línea (`x = expr` o `print(expr)`).
- **Operadores:** Suma (`+`), resta (`-`), multiplicación (`*`), menos unario (`-`) y paréntesis de agrupación.
- **Precedencia:** La multiplicación `*` tiene mayor precedencia que `+` y `-`. La asociatividad es por la izquierda.
- **Alcance secuencial estricto:** Una variable debe asignarse en una línea estrictamente anterior antes de usarse en expresiones.
- **Límites de compilación:** Máximo 8 líneas, 400 caracteres y hasta 36 fragmentos visuales en el editor.

### Gramática EBNF Oficial
```ebnf
program   = { statement } ;
statement = ( assign | print ) NEWLINE ;
assign    = ID "=" expr ;
print     = "print" "(" expr ")" ;
expr      = term { ( "+" | "-" ) term } ;
term      = factor { "*" factor } ;
factor    = NUM | ID | "(" expr ")" | "-" factor ;
```

### Arquitectura de la Máquina Objetivo (VM)
- **Registros:** 8 registros de propósito general (`R0`–`R7`). `R0` actúa como acumulador y puerto estándar para `PRINT`.
- **Formato de Instrucción:** Instrucciones little-endian de longitud fija de 8 bytes:
  `[ opcode (1B) | dst (1B) | src (1B) | reservado (1B) | imm32 (4B little-endian) ]`
- **Repertorio ISA:**
  - `LOAD 0x01`: Lee de memoria RAM al registro destino.
  - `LOADI 0x02`: Carga un valor numérico inmediato de 32 bits en el registro destino.
  - `STORE 0x03`: Almacena el valor de un registro en memoria RAM.
  - `ADD 0x10`, `SUB 0x11`, `MUL 0x12`: Operaciones aritméticas entre registros.
  - `NEG 0x13`: Negación aritmética en complemento a dos.
  - `PRINT 0x20`: Emite por consola el valor del acumulador.
  - `HALT 0xFF`: Detiene el reloj de ejecución de la CPU virtual.

---

## 🕹️ Las 7 Fases y el Modo Arcade Hero

En la **Arena de Compilación**, la pantalla está organizada como un banco de trabajo técnico (*Precision Workbench* de 2 columnas): a la izquierda se ubica el **desafío interactivo** de la fase activa y a la derecha el **Inspector de Telemetría** en tiempo real con la salida viva del compilador y el reproductor paso a paso.

| Fase | Nombre Canónico | Mini-Juego Arcade Hero | Dinámica y Aprendizaje |
| :--- | :--- | :--- | :--- |
| **01** | **Análisis Léxico** | 🚀 **Space Lexer** | Nave espacial en carriles verticales. El jugador clasifica lexemas descendentes disparando el láser correcto (<kbd>ID</kbd>, <kbd>NUM</kbd>, <kbd>OP</kbd>, <kbd>RES</kbd>). |
| **02** | **Análisis Sintáctico** | 🏗️ **AST Crane Builder** | Grúa mecánica sobre riel superior. Se desplaza con <kbd>◀</kbd>/<kbd>▶</kbd> e iza bloques con la garra <kbd>▼</kbd>/<kbd>ESPACIO</kbd>, ensamblando el árbol desde las operaciones de mayor precedencia (`*`) hasta la raíz de sentencia. |
| **03** | **Análisis Semántico** | 🧭 **Symbol Maze 6x6** | Laberinto de memoria multicamino con adyacencia ortogonal estricta. El dron debe registrar las declaraciones línea por línea evitando terminales trampa con variables inexistentes (`z_undef`) o fuera de alcance temporal. |
| **04** | **Código Intermedio** | 🎯 **Post-Order Sniper** | Campo de tiro de dianas TAC (Three-Address Code). Permutación determinista 1 a 1 donde el jugador debe apuntar y derribar las instrucciones en el orden exacto del recorrido postorden del AST. |
| **05** | **Optimización** | ⚗️ **Reactor & Purga DCE** | El jugador calcula mentalmente el plegado de constantes de las instrucciones temporales y determina qué asignaciones muertas deben ser purgadas por el recolector DCE (Dead Code Elimination). |
| **06** | **Generación Ensamblador** | ⚡ **Despachador ISA** | A partir de especificaciones funcionales de micro-operación, el usuario cablea manualmente los registros `R0`–`R7` y despacha el opcode ISA correspondiente en cada ciclo de PC. |
| **07** | **Código Binario & VM** | 💻 **Escritorio Hero-OS** | **Sin minijuego**: Muestra el volcado hexadecimal de 8 bytes y permite abrir el ejecutable `programa.exe` en un escritorio virtual con consola interactiva en tiempo real. |

---

## 🚀 Instrucciones de Ejecución

### Opción 1: Ejecución Todo-en-Uno (Scripts Rápidos)

#### En Windows:
```cmd
run.bat
```
*Abre automáticamente dos ventanas de terminal: el Backend FastAPI en `:8000` y el Frontend Vite en `:5173`.*

#### En Linux o macOS:
```bash
chmod +x run.sh
./run.sh
```

---

### Opción 2: Ejecución con Docker Compose (Recomendada para producción o demos)

Requiere tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```
O mediante los invocadores:
- Windows: `run.bat docker`
- Linux / macOS: `./run.sh docker`

**Puntos de acceso:**
- 🌐 **Frontend Web (Hero-Compiler):** [http://localhost:5173](http://localhost:5173)
- 📚 **Documentación API interactiva (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- 🩺 **Health Check API:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Opción 3: Ejecución Manual en Entornos de Desarrollo

#### 1. Backend (Python 3.11+)
```bash
cd backend

# Crear y activar entorno virtual
python -m venv .venv

# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt -r requirements-dev.txt

# Iniciar servidor de desarrollo
uvicorn compilab.api.main:app --reload --port 8000
```

#### 2. Frontend (Node.js 20+ y npm)
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Hot Reload
npm run dev
```

---

## 📖 Guía de Uso del Simulador

```text
[1. Editor de Bloques / Código] ─── Compilar (HTTP 200) ───► [2. Arena de Compilación]
                 │                                                    │
                 ▼                                                    ▼
   Misiones GUIADAS o Código Libre                 Minijuegos Arcade (Fases 1-6)
   Validador de límites (36 frags, 8 líneas)       Inspector de Telemetría (AST, TAC, Hex)
                                                                      │
                                                                      ▼
                                                       [3. Escritorio Virtual Hero-OS]
                                                       Ejecución binaria de programa.exe
```

1. **Paso 1 — Diseñar el Programa en el Editor (`/`):**
   - Elige una **Misión Predefinida** (ej. *Misión Alfa: c = a + b * 2*) o construye tu programa arrastrando bloques desde la paleta.
   - Puedes alternar libremente al editor de código fuente para escribir código MiniArit directamente.
   - Pulsa **Compilar Programa** para invocar la API del compilador.

2. **Paso 2 — Superar las Fases en la Arena (`/arena`):**
   - Avanza secuencialmente por las fases usando el selector superior.
   - En cada fase, juega el reto interactivo:
     - **Fase 1:** Muévete con <kbd>◀</kbd>/<kbd>▶</kbd>, cambia de cañón con <kbd>TAB</kbd> o <kbd>1</kbd>–<kbd>4</kbd> y destruye meteoritos con <kbd>ESPACIO</kbd>.
     - **Fase 2:** Desplaza la grúa con <kbd>◀</kbd>/<kbd>▶</kbd> y baja la garra con <kbd>▼</kbd> o <kbd>ESPACIO</kbd> para acoplar el subárbol de mayor precedencia.
     - **Fase 3:** Guía el dron con las flechas del teclado paso a paso por los pasillos; no entres a terminales cuyas variables no existan en tu tabla.
     - **Fase 4:** Apunta con la mira telescópica y derriba las dianas TAC en orden postorden con <kbd>ESPACIO</kbd>.
     - **Fase 5:** Selecciona la simplificación algebraica correcta (<kbd>1</kbd>–<kbd>4</kbd>) y autoriza la purga de código muerto.
     - **Fase 6:** Asigna el registro de destino (<kbd>0</kbd>–<kbd>7</kbd> o <kbd>X</kbd> para sin registro) y pulsa el opcode ISA correcto.
   - En caso de error, una ventana modal te explicará de inmediato la regla de compilación infringida.
   - También puedes desactivar el Modo Arcade con el botón **Modo Interactivo Activo** si prefieres solo inspeccionar la telemetría del compilador paso a paso.

3. **Paso 3 — Inspección y Ejecución en Fase 7 (`binary`):**
   - Examina la grilla de bytes hexadecimales.
   - En el **Escritorio Virtual Hero-OS**, haz doble clic en `programa.exe` para abrir la consola del sistema operativo simulado y ver el resultado exacto de ejecución en la máquina virtual.

---

## 🧪 Pruebas, Calidad y Verificación

El proyecto cuenta con suites de pruebas automatizadas en ambos lados del contrato:

### Pruebas del Backend (Pytest, Golden Files, Tipado y Linter)
```bash
cd backend
pytest -q                                      # Ejecución rápida de pruebas unitarias y de API
pytest --cov=compilab.compiler --cov-fail-under=90  # Verificación de cobertura mínima (≥ 90%)
ruff check .                                   # Linter de código Python
mypy compilab                                  # Comprobación de tipos estáticos estricta
```

### Pruebas del Frontend (Vitest, Testing Library, TypeScript y Build)
```bash
cd frontend
npm test                                       # Pruebas unitarias de stores, componentes y minijuegos
npx tsc --noEmit                               # Verificación estricta de tipos TypeScript
npm run build                                  # Compilación de producción con Vite
npm run lint                                   # Linter ESLint
```

---

## 📂 Estructura del Repositorio

```text
compilab/
├── README.md                                           # Documentación general del proyecto
├── AGENTS.md                                           # Reglas de desarrollo y directrices para agentes
├── docker-compose.yml                                  # Orquestación multicontenedor Docker
├── run.bat / run.sh                                    # Scripts de arranque automatizado local y Docker
│
├── contract/                                           # Contrato formal compartido Back-Front
│   └── fixtures/                                       # Casos de prueba canónicos (ok_basic, err_semantic, etc.)
│
├── backend/                                            # Núcleo del compilador (Python 3.11 + FastAPI)
│   ├── compilab/
│   │   ├── api/                                        # Rutas HTTP, endpoints /compile y /health, límites
│   │   ├── contract/                                   # Modelos Pydantic v2 del esquema de respuesta
│   │   └── compiler/                                   # Funciones puras de las 7 fases:
│   │       ├── lexer.py                                # Análisis léxico manual
│   │       ├── parser.py                               # Parser descendente recursivo con AST
│   │       ├── semantic.py                             # Tabla de símbolos y validación semántica
│   │       ├── ir.py                                   # Emisión de TAC (Three-Address Code)
│   │       ├── optimizer.py                            # Propagación de constantes, folding y DCE
│   │       ├── assembler.py                            # Generación de código para máquina de 8 registros
│   │       ├── encoder.py                              # Codificador binario de 8 bytes little-endian
│   │       ├── vm.py                                   # Máquina virtual ejecutora
│   │       └── pipeline.py                             # Orquestador de fases puras y traza
│   └── tests/                                          # Pruebas unitarias, de contrato, de API y golden files
│
├── frontend/                                           # Interfaz gráfica interactiva (React 18 + Vite + TS)
│   ├── src/
│   │   ├── api/                                        # Cliente HTTP y validación de respuesta con Zod
│   │   ├── domain/                                     # Bloques, serialización a texto, sourceMap (sin React)
│   │   ├── state/                                      # Stores globales Zustand (compileStore, playerStore, programStore)
│   │   ├── features/
│   │   │   ├── editor/                                 # Lienzo de bloques, paleta y editor de código
│   │   │   ├── arena/                                  # Vista Workbench, reproductor paso a paso e inspectores
│   │   │   ├── game/                                   # Los 6 minijuegos arcade (PhaseMiniGame.tsx y modal)
│   │   │   └── result/                                 # Escritorio virtual Hero-OS y consola
│   │   ├── ui/                                         # Componentes base accesibles (Button, Panel, Chip)
│   │   ├── styles/                                     # Tokens de diseño (tokens.css)
│   │   └── i18n/                                       # Textos de interfaz en español (es.ts)
│   └── tests/                                          # Pruebas automatizadas con Vitest y Testing Library
│
└── .interface-design/                                  # Especificación del sistema de diseño (tokens, jerarquía, layout)
    └── system.md
```

---

## 👥 Equipo y Sustentación

Proyecto universitario de la asignatura de **Compiladores**.  
Sustentación programada: **Viernes 27 de noviembre de 2026**.
