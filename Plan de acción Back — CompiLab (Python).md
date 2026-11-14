# Plan de acción Back — CompiLab (Python)

Nov 10, 2026 · @David\_Tyr

## Stack, convenciones y herramientas

El back es un compilador escrito a mano en Python 3.11 y expuesto por una API sin estado: recibe el código fuente y devuelve, en una sola respuesta, la traza de las 7 fases, el binario y el resultado de ejecutarlo.

| Herramienta | Uso | Por qué |
| --- | --- | --- |
| Python 3.11 | Lenguaje | Requisito del curso |
| FastAPI + Uvicorn | API HTTP | Validación con pydantic y documentación automática en `/docs` |
| pydantic v2 | Esquema del contrato | Los modelos tipados son el contrato |
| pytest + pytest-cov | Pruebas y cobertura | Parametrización y reporte de cobertura |
| hypothesis | Pruebas de propiedades | Round trips y equivalencias entre fases |
| ruff + mypy | Estilo y tipos | Se verifican en CI |

**Convenciones**

- Sin librerías de compilación (PLY, ANTLR, Lark): lexer y parser se escriben a mano.
- Cada fase es una función pura `run(entrada, tracer) -> salida`; no toca nada fuera de sus argumentos.
- Los errores de compilación son excepciones `CompileError(code, message, span, ...)`, nunca códigos HTTP. El pipeline las convierte en datos.
- Tokens, nodos e instrucciones son `@dataclass(frozen=True)`.
- Las posiciones son 1-based (línea y columna).
- Cada fase emite como máximo 200 pasos de traza.

## Arquitectura del compilador

El compilador es un pipeline de 7 funciones puras. Cada una recibe la salida de la anterior y un `Tracer` donde registra sus pasos. Si una fase lanza `CompileError`, el pipeline conserva los pasos ya registrados, marca esa fase como `error` y las siguientes como `skipped`.

**Tipos que viajan entre fases**

1. `source: str` → **Léxico** → `list[Token]`
2. `list[Token]` → **Sintáctico** → `Program` (AST con ids de nodo)
3. `Program` → **Semántico** → `SemanticInfo` (tabla de símbolos y advertencias)
4. `Program` + `SemanticInfo` → **Intermedio** → `list[TacInstr]` (código de tres direcciones)
5. `list[TacInstr]` → **Optimización** → `list[TacInstr]` más la lista de pasadas aplicadas
6. `list[TacInstr]` → **Ensamblador** → `list[AsmInstr]` (registros asignados)
7. `list[AsmInstr]` → **Binario** → `bytes`
8. `bytes` → **VM** (ejecución, no es una fase de compilación) → `RunResult` con salida, código de salida y traza

```text
backend/
  compilab/
    api/          main.py, routes.py, limits.py
    contract/     models.py        # pydantic: PhaseResult, Step, Op, ErrorInfo
    compiler/
      errors.py     # CompileError y catálogo de códigos
      tracer.py     # Tracer, Step
      lexer.py      # tokenize()
      parser.py     # parse()
      semantic.py   # analyze()
      ir.py         # lower()
      optimizer.py  # optimize()
      assembler.py  # assemble()
      encoder.py    # encode(), decode()
      vm.py         # run()
      pipeline.py   # compile_source()
  tests/
    unit/  golden/  property/  api/  contract/
contract/fixtures/  # compartido con el front
```

Interfaz común de las fases:

```python
class Tracer:
    def step(self, title: str, explain: str, ops: list[Op],
             focus: Focus | None = None) -> None: ...

def tokenize(source: str, tracer: Tracer) -> list[Token]: ...   # lanza CompileError
def parse(tokens: list[Token], tracer: Tracer) -> Program: ...
```

El pipeline no contiene lógica de fases: solo las orquesta, mide tiempos y arma la respuesta.

## Especificación del lenguaje

MiniArit tiene una instrucción por línea y usa enteros de 32 bits con signo (de −2 147 483 648 a 2 147 483 647).

**Tokens**

| Token | Patrón | Ejemplo |
| --- | --- | --- |
| `NUM` | `[0-9]+` | `42` |
| `ID` | `[a-zA-Z_][a-zA-Z0-9_]*`, salvo `print` | `total_1` |
| `PRINT` | Palabra reservada | `print` |
| `ASSIGN`, `PLUS`, `MINUS`, `STAR` | `=` `+` `-` `*` | `a = b + c - d * e` |
| `LPAREN`, `RPAREN` | `(` `)` | `(a + b)` |
| `NEWLINE`, `EOF` | Fin de línea y fin de entrada |  |

Los espacios y tabulaciones se ignoran. Cualquier otro carácter es el error E-101.

**Gramática (EBNF)**

```ebnf
program   = { statement } ;
statement = ( assign | print ) NEWLINE ;
assign    = ID "=" expr ;
print     = "print" "(" expr ")" ;
expr      = term { ( "+" | "-" ) term } ;
term      = factor { "*" factor } ;
factor    = NUM | ID | "(" expr ")" | "-" factor ;
```

`*` tiene más precedencia que `+` y `-`, y las tres operaciones asocian por la izquierda: `a - b - 1` es `(a - b) - 1`.

**Reglas semánticas**

1. Una variable necesita una asignación en una línea anterior antes de usarse (E-301). `a = a + 1` sin una `a` previa también la incumple.
2. Reasignar una variable es válido.
3. Una variable asignada que nunca se usa genera la advertencia W-301, no un error.
4. Todos los valores son enteros de 32 bits; un literal fuera de rango es el error E-103.

**Máquina objetivo (ISA).** 8 registros (`R0`–`R7`), una celda de memoria de datos por variable e instrucciones de 8 bytes de longitud fija.

| Opcode | Mnemónico | Efecto |
| --- | --- | --- |
| `0x01` | `LOAD Rd, [addr]` | Rd = memoria\[addr\] |
| `0x02` | `LOADI Rd, imm` | Rd = imm |
| `0x03` | `STORE [addr], Rs` | memoria\[addr\] = Rs |
| `0x10` | `ADD Rd, Rs` | Rd = Rd + Rs |
| `0x11` | `SUB Rd, Rs` | Rd = Rd − Rs |
| `0x12` | `MUL Rd, Rs` | Rd = Rd × Rs |
| `0x13` | `NEG Rd` | Rd = −Rd |
| `0x20` | `PRINT Rs` | Escribe Rs en la salida |
| `0xFF` | `HALT` | Termina con código 0 |

**Codificación (8 bytes, little-endian).** Byte 0: opcode. Byte 1: registro destino. Byte 2: registro fuente. Byte 3: reservado (0). Bytes 4–7: inmediato o dirección con signo. Ejemplo: `LOADI R0, 11` se codifica `02 00 00 00 0b 00 00 00`.

## Contrato JSON de trazas y catálogo de errores

**Petición**

```json
POST /api/compile
{ "source": "a = 5\nb = 3\nc = a + b * 2\nprint(c)", "optimize": true }
```

**Estructura de una fase**

```json
{
  "id": "syntactic",
  "name": "Análisis sintáctico",
  "status": "ok",
  "summary": "7 nodos en el árbol",
  "steps": [
    {
      "i": 4,
      "title": "Agrupar b * 2",
      "explain": "× tiene más precedencia que +, así que b * 2 se agrupa primero.",
      "focus": { "span": { "line": 3, "col": 9, "len": 5 }, "nodeIds": ["n5", "n6", "n7"] },
      "ops": [
        { "op": "node", "id": "n5", "label": "*", "kind": "binop" },
        { "op": "edge", "parent": "n4", "child": "n5" }
      ]
    }
  ],
  "output": { "ast": { "id": "n1", "kind": "assign", "name": "c", "children": [ "…" ] } }
}
```

**Operaciones por fase (`ops`)**

| Fase | Operaciones | Qué significan |
| --- | --- | --- |
| `lexical` | `token`, `skip`, `fail` | Se reconoció un token, se ignoró un espacio, se encontró un carácter inválido |
| `syntactic` | `rule`, `shift`, `node`, `edge`, `fail` | Se entró a una regla, se consumió un token, se creó un nodo, se unió con su padre |
| `semantic` | `declare`, `lookup`, `warn`, `fail` | Se registró una variable, se buscó en la tabla (con `found`), se emitió una advertencia |
| `ir` | `emit` | Se generó una instrucción de tres direcciones (`index`, `text`, `fromNode`) |
| `optimization` | `pass`, `fold`, `propagate`, `remove`, `fail` | Empezó una pasada, se calculó una operación, se sustituyó una variable, se eliminó una instrucción |
| `assembly` | `alloc`, `free`, `emit` | Se asignó o liberó un registro, se emitió una instrucción de máquina |
| `binary` | `encode` | Se codificó una instrucción (`offset`, `bytes`, `asm`) |

**Salida por fase (`output`).** `lexical` → `tokens`. `syntactic` → `ast` (cada nodo con `id`, `kind`, `span`, `children`). `semantic` → `symbols` y `warnings`. `ir` y `optimization` → `instructions`; la segunda añade `passes` con el número de cambios por pasada. `assembly` → `instructions` con `text` y `fromIr`. `binary` → `hex`, `size` y `rows` (una por instrucción: `offset`, `bytes`, `asm`, `ir`).

**Ejecución (`run`).** `{ "stdout": ["11"], "exitCode": 0, "steps": [ { "pc": 0, "asm": "LOADI R0, 11", "registers": [11,0,0,0,0,0,0,0] } ] }`

**Objeto de error**

```json
{
  "code": "E-301",
  "kind": "semantic",
  "phase": "semantic",
  "message": "La variable \"d\" no fue declarada",
  "why": "Una variable necesita recibir un valor en una línea anterior antes de usarse.",
  "hint": "Agrega una asignación como d = 4 antes de la línea 3.",
  "span": { "line": 3, "col": 9, "len": 1 },
  "stepIndex": 3,
  "fixes": [
    { "label": "Agregar d = 4 antes de la línea 3", "kind": "insert_assignment", "name": "d", "value": 4, "beforeLine": 3 },
    { "label": "Cambiar d por a", "kind": "replace_variable", "line": 3, "from": "d", "to": "a" }
  ]
}
```

Los `fixes` son operaciones estructuradas y no parches de texto, porque el editor trabaja con bloques y no con texto.

**Catálogo de errores**

| Código | Tipo | Fase | Se dispara cuando | Ejemplo |
| --- | --- | --- | --- | --- |
| E-101 | Léxico | `lexical` | Aparece un carácter fuera del alfabeto | `a = 5 @ 2` |
| E-102 | Léxico | `lexical` | Un número va pegado a letras | `a = 3b` |
| E-103 | Léxico | `lexical` | Un literal no cabe en 32 bits | `a = 3000000000` |
| E-201 | Sintáctico | `syntactic` | Falta un operando | `c = + 2` |
| E-202 | Sintáctico | `syntactic` | Paréntesis sin cerrar o sin abrir | `c = (1 + 2` |
| E-203 | Sintáctico | `syntactic` | Falta `=` después del identificador | `c 5` |
| E-204 | Sintáctico | `syntactic` | La línea no empieza con identificador ni `print` | `5 = a` |
| E-205 | Sintáctico | `syntactic` | `print` sin paréntesis | `print c` |
| E-301 | Semántico | `semantic` | Se usa una variable sin valor previo | `a = d + 1` |
| E-401 | Aritmético | `optimization` | El plegado de constantes desborda 32 bits | `a = 100000 * 100000` |
| E-402 | Aritmético | `run` | La ejecución desborda 32 bits (con `optimize: false`) | `a = 100000 * 100000` |
| E-501 | Límite | `input` | El programa pasa de 8 líneas o 400 caracteres | 9 líneas |
| E-502 | Límite | `assembly` | Más de 8 temporales vivos a la vez | Expresión muy anidada |
| E-503 | Límite | `run` | La ejecución pasa de 1000 instrucciones | Bucle imposible por diseño; protege la VM |
| E-599 | Interno | `internal` | Falla inesperada del servidor | N/A |

W-301 es una advertencia (variable asignada y nunca usada): viaja en `semantic.output.warnings` y no detiene la compilación.

## Fases BE-0 a BE-4

Cada BE-n corresponde a la fase Fn de la hoja de ruta. Las pruebas se corren desde `backend/` con `pytest`.

### BE-0 · Esqueleto y contrato (10–11 nov)

**Necesidades.** Que el front pueda trabajar contra el API real desde el día 2.

**Requisitos**

- Proyecto Python con `pyproject.toml`, entorno virtual, ruff, mypy y pytest configurados.
- Modelos pydantic del contrato en `contract/models.py`: `CompileRequest`, `CompileResponse`, `PhaseResult`, `Step`, `Op` y `ErrorInfo`.
- `GET /api/health` y `POST /api/compile`; este último devuelve la fixture que corresponda mientras no hay compilador.
- CORS para `http://localhost:5173`.
- Fixtures en `contract/fixtures/`: `ok_basic.json`, `err_semantic.json` y `err_syntactic.json`.

**Criterios de aceptación**

- [ ] `uvicorn compilab.api.main:app` levanta y `/docs` lista los endpoints.
- [ ] Cada fixture valida contra `CompileResponse`.
- [ ] `pytest`, `ruff check` y `mypy` pasan en CI.

**Pruebas**

```python
import json, pathlib, pytest
from fastapi.testclient import TestClient
from compilab.api.main import app
from compilab.contract.models import CompileResponse

FIXTURES = sorted(pathlib.Path("../contract/fixtures").glob("*.json"))
client = TestClient(app)

@pytest.mark.parametrize("path", FIXTURES, ids=lambda p: p.stem)
def test_fixture_cumple_el_esquema(path):
    CompileResponse.model_validate(json.loads(path.read_text(encoding="utf-8")))

def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}

def test_compile_devuelve_las_7_fases():
    body = client.post("/api/compile", json={"source": "a = 5\nprint(a)"}).json()
    assert [p["id"] for p in body["phases"]] == [
        "lexical", "syntactic", "semantic", "ir", "optimization", "assembly", "binary"]
```

### BE-1 · Léxico (11–13 nov)

**Necesidades.** Convertir texto en tokens con posición exacta y explicar cada decisión.

**Requisitos**

- `tokenize(source, tracer)` recorre el texto con un autómata de un carácter de anticipación.
- Reconoce `NUM`, `ID`, `PRINT`, `ASSIGN`, `PLUS`, `MINUS`, `STAR`, `LPAREN`, `RPAREN`, `NEWLINE` y `EOF`.
- Un paso por token (`op: token`) con `explain`; por ejemplo, "`print` es una palabra reservada, no un identificador".
- Errores E-101 (carácter inválido), E-102 (número pegado a letras) y E-103 (literal fuera de 32 bits), todos con `span`.
- Línea y columna 1-based; `\r\n` cuenta como un solo salto de línea.

**Criterios de aceptación**

- [ ] `c = a + b * 2` produce 7 tokens más `NEWLINE` y `EOF`.
- [ ] `print` es `PRINT` y `printer` es `ID`.
- [ ] `a = 3b` lanza E-102 en la columna 5.
- [ ] `a = 2147483648` lanza E-103 y `a = 2147483647` es válido.
- [ ] La traza trae un paso por token y, en un error, el último paso es `fail`.

**Pruebas**

```python
import pytest
from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import tokenize
from compilab.compiler.tracer import Tracer

def kinds(src):
    toks = tokenize(src, Tracer())
    return [(t.type.name, t.lexeme) for t in toks if t.type.name not in ("NEWLINE", "EOF")]

@pytest.mark.parametrize("src, esperado", [
    ("a = 5", [("ID", "a"), ("ASSIGN", "="), ("NUM", "5")]),
    ("c = a + b * 2", [("ID","c"),("ASSIGN","="),("ID","a"),("PLUS","+"),("ID","b"),("STAR","*"),("NUM","2")]),
    ("print(c)", [("PRINT","print"),("LPAREN","("),("ID","c"),("RPAREN",")")]),
    ("printer = 1", [("ID","printer"),("ASSIGN","="),("NUM","1")]),
    ("x = -(1 - y)", [("ID","x"),("ASSIGN","="),("MINUS","-"),("LPAREN","("),
                     ("NUM","1"),("MINUS","-"),("ID","y"),("RPAREN",")")]),
])
def test_tokens(src, esperado):
    assert kinds(src) == esperado

@pytest.mark.parametrize("src, codigo, linea, col", [
    ("a = @", "E-101", 1, 5),
    ("a = 3b", "E-102", 1, 5),
    ("a = 2147483648", "E-103", 1, 5),
    ("a = 1\nb = #", "E-101", 2, 5),
])
def test_errores_lexicos(src, codigo, linea, col):
    with pytest.raises(CompileError) as e:
        tokenize(src, Tracer())
    assert (e.value.code, e.value.span.line, e.value.span.col) == (codigo, linea, col)

def test_literal_maximo_es_valido():
    assert kinds("a = 2147483647")[-1] == ("NUM", "2147483647")

def test_la_traza_tiene_un_paso_por_token():
    t = Tracer(); tokenize("a = 5", t)
    assert sum(1 for s in t.steps for o in s.ops if o["op"] == "token") == 3
```

### BE-2 · Sintáctico (13–15 nov)

**Necesidades.** Construir el AST respetando precedencia y asociatividad, y explicar cada regla.

**Requisitos**

- `parse(tokens, tracer)`: descendente recursivo con una función por regla (`program`, `statement`, `expr`, `term`, `factor`).
- AST con nodos `assign`, `print`, `binop`, `neg`, `num` y `var`; cada nodo lleva `id` (`n1`, `n2`…), `span` y `children`.
- Trazas: `rule` al entrar a una regla, `shift` al consumir un token, `node` y `edge` al crear el árbol.
- Errores E-201 a E-205 con el mensaje "se esperaba X y llegó Y".
- Utilidad `to_sexpr(ast)` para pruebas y depuración.

**Criterios de aceptación**

- [ ] `c = a + b * 2` → `(assign c (+ a (* b 2)))`.
- [ ] `a - b - 1` asocia por la izquierda.
- [ ] `-a * 2` → `(* (neg a) 2)`.
- [ ] Cada error E-2xx tiene su caso con línea y columna exactas.
- [ ] Los ids de nodo son estables: el mismo programa genera los mismos ids.

**Pruebas**

```python
import pytest
from compilab.compiler.parser import parse, to_sexpr
from compilab.compiler.lexer import tokenize
from compilab.compiler.errors import CompileError
from compilab.compiler.tracer import Tracer

def sexpr(src):
    return to_sexpr(parse(tokenize(src, Tracer()), Tracer()))

@pytest.mark.parametrize("src, esperado", [
    ("c = a + b * 2",   "(assign c (+ a (* b 2)))"),
    ("c = (a + b) * 2", "(assign c (* (+ a b) 2))"),
    ("c = a - b - 1",   "(assign c (- (- a b) 1))"),
    ("c = -a * 2",      "(assign c (* (neg a) 2))"),
    ("print(1 + 2)",    "(print (+ 1 2))"),
])
def test_ast(src, esperado):
    assert sexpr(src) == esperado

@pytest.mark.parametrize("src, codigo, linea, col", [
    ("c = + 2",    "E-201", 1, 5),
    ("c = 1 +",    "E-201", 1, 8),
    ("c = (1 + 2", "E-202", 1, 11),
    ("c 5",        "E-203", 1, 3),
    ("5 = a",      "E-204", 1, 1),
    ("print c",    "E-205", 1, 7),
])
def test_errores_sintacticos(src, codigo, linea, col):
    with pytest.raises(CompileError) as e:
        sexpr(src)
    assert (e.value.code, e.value.span.line, e.value.span.col) == (codigo, linea, col)

def test_ids_estables():
    a = parse(tokenize("c = a + b * 2", Tracer()), Tracer())
    b = parse(tokenize("c = a + b * 2", Tracer()), Tracer())
    assert a == b
```

## Fases BE-5 a BE-9

### BE-5 · Ensamblador, binario y VM (19–21 nov)

**Necesidades.** Generar código de máquina real a partir del intermedio y ejecutarlo.

**Requisitos**

- `assemble(ir, tracer)` traduce cada instrucción del intermedio con este esquema: los operandos variables se cargan con `LOAD` desde su celda de memoria y los literales con `LOADI`; la operación (`ADD`, `SUB`, `MUL` o `NEG`) deja el resultado en el registro del primer operando; si el destino es una variable de usuario se guarda con `STORE`, y si es un temporal se queda en su registro; `print` usa `PRINT`; el programa termina con `HALT`.
- Asignación lineal de registros sobre `R0`–`R7`: un temporal ocupa un registro desde su definición hasta su último uso. Si no quedan registros libres se lanza E-502.
- Una celda de memoria por variable, numeradas en orden de primera asignación.
- Trazas `alloc`, `free` y `emit` (con `fromIr`).
- `encode(program) -> bytes` y `decode(bytes) -> program` (8 bytes por instrucción, little-endian); trazas `encode` con `offset`, `bytes` y `asm`.
- `run(code, max_steps=1000)` ejecuta con un contador de programa, 8 registros y memoria, y devuelve `RunResult(stdout, exit_code, steps)`. Cada `ADD`, `SUB`, `MUL` y `NEG` comprueba el rango de 32 bits; si se sale, E-402. Pasar de 1000 instrucciones, E-503.

**Criterios de aceptación**

- [ ] `print 11` genera `LOADI R0, 11`, `PRINT R0`, `HALT` y 24 bytes.
- [ ] `decode(encode(p)) == p` para todo programa válido.
- [ ] El binario de `a = 5`, `b = 3`, `c = a + b * 2`, `print(c)` sin optimizar imprime `11`.
- [ ] `a = 100000 * 100000` con `optimize: false` falla en la VM con E-402 y deja la traza hasta el `MUL`.
- [ ] Una expresión que necesita más temporales vivos que registros libres lanza E-502.

**Pruebas**

```python
from hypothesis import given, strategies as st
from compilab.compiler.assembler import AsmInstr
from compilab.compiler.encoder import encode, decode
from compilab.compiler.vm import run
# compilar_a_asm(src, optimize): helper de tests/helpers.py que corre el pipeline hasta ensamblador

def test_print_11_se_codifica_en_24_bytes():
    prog = [AsmInstr("LOADI", dst=0, imm=11), AsmInstr("PRINT", src=0), AsmInstr("HALT")]
    assert encode(prog).hex(" ") == (
        "02 00 00 00 0b 00 00 00 "
        "20 00 00 00 00 00 00 00 "
        "ff 00 00 00 00 00 00 00")

instrs = st.one_of(
    st.builds(AsmInstr, st.just("LOADI"), dst=st.integers(0, 7), imm=st.integers(-2**31, 2**31 - 1)),
    st.builds(AsmInstr, st.just("ADD"), dst=st.integers(0, 7), src=st.integers(0, 7)),
    st.builds(AsmInstr, st.just("PRINT"), src=st.integers(0, 7)),
    st.just(AsmInstr("HALT")),
)

@given(st.lists(instrs, max_size=30))
def test_codificar_y_decodificar_no_pierde_nada(prog):
    assert decode(encode(prog)) == prog

def test_vm_imprime_11_sin_optimizar():
    code = encode(compilar_a_asm(PROGRAMA, optimize=False))
    assert run(code).stdout == ["11"]

def test_desbordamiento_en_ejecucion():
    with pytest.raises(CompileError) as e:
        run(encode(compilar_a_asm("a = 100000 * 100000", optimize=False)))
    assert e.value.code == "E-402"

def anidada(n):
    # (1*1) + ((2*2) + ((3*3) + ...)): cada producto sigue vivo mientras se calcula el resto
    expr = f"({n}*{n})"
    for i in range(n - 1, 0, -1):
        expr = f"({i}*{i}) + ({expr})"
    return f"x = {expr}\nprint(x)"

def test_registros_agotados():
    compilar_a_asm(anidada(2), optimize=False)          # cabe
    with pytest.raises(CompileError) as e:
        compilar_a_asm(anidada(12), optimize=False)     # no cabe
    assert e.value.code == "E-502"
```

### BE-6 · Errores completos y ejemplos (21–22 nov)

**Necesidades.** Cada error debe explicar la causa, señalar el punto exacto y proponer un arreglo.

**Requisitos**

- `compiler/errors.py` con el catálogo como `dict[str, ErrorSpec]`: plantillas de `message`, `why` y `hint` por código.
- `CompileError(code, span, args)` rellena las plantillas; los `fixes` los calcula la fase que lanza el error (E-301 → `insert_assignment` y `replace_variable`).
- `stepIndex` = índice del último paso registrado antes del fallo, que es un paso `fail`.
- El pipeline marca la fase del error con `status: error`, las posteriores como `skipped` con `steps: []` y responde `ok: false` con HTTP 200.
- Un manejador global convierte cualquier excepción inesperada en la respuesta E-599 (HTTP 500 con el mismo formato de error).
- `GET /api/examples` devuelve `{id, title, kind, source}` de 3 programas válidos (suma con prioridad, resta con negativo, variables encadenadas) y 3 con error (E-301, E-202 y E-401).

**Criterios de aceptación**

- [ ] Cada código del catálogo se dispara con al menos una entrada de prueba.
- [ ] En toda respuesta de error, `stepIndex` apunta a un paso `fail`.
- [ ] Las fases posteriores a un error son `skipped`.
- [ ] `GET /api/examples` devuelve 6 programas y cada uno compila con el resultado que declara en `kind`.

**Pruebas**

```python
CASOS = [  # (fuente, código, fase)
    ("a = @", "E-101", "lexical"),
    ("a = 3b", "E-102", "lexical"),
    ("a = 3000000000", "E-103", "lexical"),
    ("c = + 2", "E-201", "syntactic"),
    ("c = (1 + 2", "E-202", "syntactic"),
    ("c 5", "E-203", "syntactic"),
    ("5 = a", "E-204", "syntactic"),
    ("print c", "E-205", "syntactic"),
    ("a = d + 1", "E-301", "semantic"),
    ("a = 100000 * 100000", "E-401", "optimization"),
]

@pytest.mark.parametrize("src, code, fase", CASOS)
def test_catalogo_por_api(src, code, fase):
    body = client.post("/api/compile", json={"source": src}).json()
    assert body["ok"] is False
    assert (body["error"]["code"], body["error"]["phase"]) == (code, fase)
    fallida = next(p for p in body["phases"] if p["id"] == fase)
    assert fallida["status"] == "error"
    assert fallida["steps"][body["error"]["stepIndex"]]["ops"][-1]["op"] == "fail"

def test_fases_posteriores_quedan_skipped():
    body = client.post("/api/compile", json={"source": "a = d + 1"}).json()
    assert [p["status"] for p in body["phases"]] == [
        "ok", "ok", "error", "skipped", "skipped", "skipped", "skipped"]

def test_overflow_en_ejecucion_con_optimize_false():
    body = client.post("/api/compile",
                       json={"source": "a = 100000 * 100000", "optimize": False}).json()
    assert (body["error"]["code"], body["error"]["phase"]) == ("E-402", "run")

def test_ejemplos_declaran_lo_que_hacen():
    for ej in client.get("/api/examples").json():
        body = client.post("/api/compile", json={"source": ej["source"]}).json()
        assert body["ok"] == (ej["kind"] == "valid")
```

## Estrategia de pruebas del back

| Nivel | Qué cubre | Herramienta | Meta |
| --- | --- | --- | --- |
| Unitarias | Cada fase con entradas parametrizadas | pytest | Un caso por código de error del catálogo |
| Golden | Salida completa de tokens, AST, intermedio y ensamblador de 10 programas | pytest + `tests/golden/*.json` | Los cambios requieren `--update-golden` y revisión |
| Propiedades | Codificar y decodificar; optimizar sin cambiar la salida; VM equivalente al intérprete del intermedio | hypothesis | 200 ejemplos por propiedad |
| Contrato | Fixtures y respuestas reales contra `CompileResponse` | pytest + pydantic | 100% de las respuestas validadas |
| API | Endpoints, límites, errores y E-599 | `TestClient` | Cada endpoint con caso feliz y caso de error |
| Tipos y estilo | Todo el código | mypy (estricto en `compiler/`) y ruff | Cero errores en CI |

**Generador de programas** (`tests/strategies.py`). Produce programas válidos de hasta 6 líneas con variables ya definidas, literales entre −1000 y 1000 y operaciones `+`, `-` y `*` con paréntesis opcionales. Una variante con literales grandes provoca desbordamientos a propósito. Lo usan todas las pruebas de propiedades.

**Reglas**

- Una prueba por criterio de aceptación; el título la nombra.
- Las pruebas no dependen del orden ni de la red.
- Cobertura mínima de `compilab/compiler`: 90%.
- Comandos: `pytest -q`, `pytest --cov=compilab.compiler --cov-fail-under=90`, `ruff check .` y `mypy compilab`.

## Seguridad y límites de la API

El back recibe texto de desconocidos y lo procesa con código propio, así que cada recurso tiene un tope.

| Recurso | Límite | Qué pasa al superarlo |
| --- | --- | --- |
| Cuerpo de la petición | 2 KB | HTTP 413 |
| Líneas del programa | 8 | E-501 (HTTP 200, `ok: false`) |
| Caracteres del programa | 400 | E-501 |
| Instrucciones ejecutadas en la VM | 1000 | E-503 |
| Registros | 8 | E-502 |
| Peticiones por IP | 30 por minuto | HTTP 429 |

**Principios**

- Nunca `eval`, `exec` ni `subprocess` con datos del usuario: el programa solo lo procesan el lexer, el parser y la VM propios.
- Validación estricta de la entrada con pydantic (`source` texto, `optimize` booleano, `kind` y `seed` acotados).
- Con 8 líneas y 400 caracteres ninguna fase pasa de 200 pasos de traza; una prueba lo verifica con el peor caso.
- CORS solo para el origen del front en desarrollo; en producción el front y el API comparten origen.
- Los logs guardan longitud y hash del código, nunca el texto.
- Las excepciones inesperadas se responden como E-599 sin mostrar el stack al usuario.
- Dependencias fijadas en `requirements.txt` con versiones exactas.

### BE-3 · Semántico (15–17 nov)

**Necesidades.** Verificar el significado del programa antes de generar código y explicar qué pasa con cada variable.

**Requisitos**

- `analyze(program, tracer)` recorre las sentencias en orden con una tabla de símbolos (`dict[str, Symbol]`).
- `Symbol(name, type="int", defined_line, uses, literal)`; `literal` guarda el valor cuando se asigna un número directo (solo informativo).
- En cada asignación evalúa primero el lado derecho, para detectar `a = a + 1` sin `a` previa, y después declara.
- Un paso `lookup` (con `found`) por cada variable usada y un paso `declare` por asignación.
- E-301 con el `span` de la variable, `why` y `fixes` estructurados.
- W-301 al terminar, por cada variable asignada y nunca usada.

**Criterios de aceptación**

- [ ] `a = d + 1` lanza E-301 en la línea 1, columna 5.
- [ ] `a = a + 1` sin `a` previa lanza E-301.
- [ ] `a = 1` seguido de `a = a + 1` es válido.
- [ ] `a = 5` seguido de `print(1)` genera W-301 y compila.
- [ ] El error trae al menos un `fix` aplicable.

**Pruebas**

```python
def run_semantic(src):
    t = Tracer()
    prog = parse(tokenize(src, t), t)
    return analyze(prog, t), t

def test_uso_antes_de_definir():
    with pytest.raises(CompileError) as e:
        run_semantic("a = d + 1")
    assert (e.value.code, e.value.span.col) == ("E-301", 5)
    assert e.value.fixes[0]["kind"] == "insert_assignment"

def test_autoreferencia_sin_valor_previo():
    with pytest.raises(CompileError) as e:
        run_semantic("a = a + 1")
    assert e.value.code == "E-301"

def test_reasignacion_valida():
    info, _ = run_semantic("a = 1\na = a + 1")
    assert info.symbols["a"].uses == 1

def test_variable_no_usada_genera_advertencia():
    info, _ = run_semantic("a = 5\nprint(1)")
    assert [w.code for w in info.warnings] == ["W-301"]
```

### BE-4 · Código intermedio y optimización (17–19 nov)

**Necesidades.** Traducir el árbol a instrucciones simples y simplificarlas con pasadas independientes que se puedan mostrar una por una.

**Requisitos**

- `lower(program, tracer)` recorre el AST en postorden y emite `TacInstr(op, dst, a, b)`. Los temporales se numeran `t1`, `t2`… y cada `emit` guarda `fromNode`.
- Formato de texto: `t1 = b * 2`, `c = t2`, `print c`.
- `optimize(ir, tracer, enabled=True)` aplica cuatro pasadas en este orden y repite hasta que no haya cambios (máximo 8 vueltas):
  1. Plegado de constantes (`3 * 2` pasa a `6`); si desborda 32 bits lanza E-401.
  2. Propagación de constantes (reemplaza variables de valor conocido).
  3. Propagación de copias (`c = t2` hace que se use `t2` directamente).
  4. Eliminación de código muerto (asignaciones cuyo resultado nunca se lee).
- Cada pasada emite `pass` y, por cada cambio, `fold`, `propagate` o `remove` con la instrucción antes y después.
- `enabled=False` devuelve el intermedio sin tocar y sin pasos.

**Criterios de aceptación**

- [ ] `a = 5`, `b = 3`, `c = a + b * 2`, `print(c)` genera 6 instrucciones intermedias.
- [ ] Optimizado queda `print 11`.
- [ ] `a = 100000 * 100000` lanza E-401 con la optimización activa.
- [ ] Cada instrucción eliminada aparece en la traza con su motivo.
- [ ] Con `optimize: false` el resultado es idéntico al intermedio.

**Pruebas**

```python
PROGRAMA = "a = 5\nb = 3\nc = a + b * 2\nprint(c)"

def ir_text(src, optimize_on):
    t = Tracer()
    prog = parse(tokenize(src, t), t)
    ir = lower(prog, t)
    return [str(i) for i in optimize(ir, t, enabled=optimize_on)]

def test_intermedio_sin_optimizar():
    assert ir_text(PROGRAMA, False) == [
        "a = 5", "b = 3", "t1 = b * 2", "t2 = a + t1", "c = t2", "print c"]

def test_optimizado_queda_en_print_11():
    assert ir_text(PROGRAMA, True) == ["print 11"]

def test_desbordamiento_en_plegado():
    with pytest.raises(CompileError) as e:
        ir_text("a = 100000 * 100000", True)
    assert e.value.code == "E-401"

# run_ir: intérprete mínimo del intermedio (tests/helpers.py) que devuelve (ok, stdout)
@given(programas())
def test_optimizar_no_cambia_la_salida(src):
    ok_sin, out_sin = run_ir(src, optimize=False)
    ok_con, out_con = run_ir(src, optimize=True)
    assert ok_sin == ok_con
    if ok_sin:
        assert out_sin == out_con
```

### BE-7 · Ejecución y traza de ejecución (22–23 nov)

**Necesidades.** Que la consola y el resumen muestren datos reales de la ejecución.

**Requisitos**

- `RunResult(stdout: list[str], exit_code: int, steps: list[RunStep])` y `RunStep(pc, asm, registers, memory)`.
- Cada `PRINT` agrega una línea a `stdout` con el entero en decimal.
- Un programa sin `print` devuelve `stdout: []` y `exitCode: 0`.
- Si la VM lanza E-402 o E-503: `ok: false`, `error.phase = "run"`, y `run` conserva los `steps` hasta el fallo para poder animarlo.
- El pipeline mide el tiempo de cada fase y el total en `meta.elapsedMs`.
- `executable` trae `hex`, `size` y `rows` (offset, bytes, asm, ir).

**Criterios de aceptación**

- [ ] `a = 5`, `b = 3`, `c = a + b * 2`, `print(c)` imprime `["11"]` con la optimización activada y desactivada.
- [ ] Un programa sin `print` termina con código 0 y salida vacía.
- [ ] `steps` nunca pasa de 1000 elementos.
- [ ] `meta.elapsedMs` está presente y es mayor o igual a 0.

**Pruebas**

```python
@pytest.mark.parametrize("optimize", [True, False])
def test_misma_salida_con_y_sin_optimizar(optimize):
    body = client.post("/api/compile", json={"source": PROGRAMA, "optimize": optimize}).json()
    assert body["run"]["stdout"] == ["11"]
    assert body["run"]["exitCode"] == 0

def test_programa_sin_print():
    body = client.post("/api/compile", json={"source": "a = 5"}).json()
    assert body["ok"] and body["run"]["stdout"] == []

def test_el_binario_devuelto_es_el_ejecutado():
    body = client.post("/api/compile", json={"source": PROGRAMA}).json()
    code = bytes.fromhex(body["executable"]["hex"].replace(" ", ""))
    assert run(code).stdout == body["run"]["stdout"]

def test_la_traza_de_ejecucion_cabe_en_el_limite():
    body = client.post("/api/compile", json={"source": PROGRAMA}).json()
    assert 0 < len(body["run"]["steps"]) <= 1000
    assert body["meta"]["elapsedMs"] >= 0
```

### BE-8 · Mutaciones para el modo detective (23–24 nov, recortable)

**Necesidades.** Generar bugs realistas, de un tipo conocido, a partir del programa del usuario.

**Requisitos**

- `POST /api/mutate` con `{source, kind, seed}` responde `{source, kind, expectedCode, description}`.
- `mutate(source, kind, seed)` aplica una mutación determinista:
  - `lexical`: inserta un carácter inválido (`@`, `#` o `$`) después de un operador (E-101).
  - `syntactic`: borra un operando o un paréntesis de cierre (E-201 o E-202).
  - `semantic`: cambia el uso de una variable por un nombre no definido (E-301).
  - `arithmetic`: reemplaza una multiplicación por `100000 * 100000` (E-401).
- Si el programa no tiene dónde aplicar la mutación (por ejemplo, `semantic` sin ninguna variable usada), responde 422 con un mensaje claro, no un 500.
- `description` va en español y no revela la fase, para no arruinar la predicción del usuario.

**Criterios de aceptación**

- [ ] Para cada `kind`, la variante falla con un error del tipo pedido.
- [ ] La misma `seed` devuelve la misma variante.
- [ ] `description` no menciona el nombre de la fase.
- [ ] Una mutación imposible devuelve 422.

**Pruebas**

```python
BASE = "a = 5\nb = 3\nc = a + b * 2\nprint(c)"
TIPOS = {"lexical": "E-1", "syntactic": "E-2", "semantic": "E-3", "arithmetic": "E-4"}

@pytest.mark.parametrize("kind, prefijo", TIPOS.items())
def test_la_mutacion_falla_con_el_tipo_pedido(kind, prefijo):
    m = client.post("/api/mutate", json={"source": BASE, "kind": kind, "seed": 7}).json()
    body = client.post("/api/compile", json={"source": m["source"]}).json()
    assert body["ok"] is False
    assert body["error"]["code"].startswith(prefijo)
    assert body["error"]["code"] == m["expectedCode"]

def test_misma_semilla_misma_variante():
    pedir = lambda: client.post("/api/mutate", json={"source": BASE, "kind": "semantic", "seed": 3}).json()
    assert pedir() == pedir()

def test_mutacion_imposible_devuelve_422():
    r = client.post("/api/mutate", json={"source": "print(1)", "kind": "semantic", "seed": 1})
    assert r.status_code == 422
```

### BE-9 · Hardening y empaquetado (24–25 nov)

**Necesidades.** Que el back aguante entradas absurdas y arranque con un solo comando.

**Requisitos**

- Límites de entrada: cuerpo de 2 KB como máximo (413), programa de hasta 8 líneas y 400 caracteres (E-501) y `source` obligatorio de tipo texto (422 de FastAPI en otro caso).
- Límite de peticiones por IP (30 por minuto con `slowapi`).
- Manejador global de excepciones que responde E-599; los logs no incluyen el código fuente, solo su longitud y un hash.
- FastAPI sirve `frontend/dist` como estáticos en `/` y deja `/api/*` para el API.
- `run.sh` y `run.bat`: crean el entorno, instalan dependencias, construyen el front y levantan Uvicorn en `http://localhost:8000`.
- Cobertura de `compilab/compiler` de al menos 90%.

**Criterios de aceptación**

- [ ] Un programa de 9 líneas devuelve E-501 sin ejecutar ninguna fase.
- [ ] Un cuerpo de 12 KB devuelve 413.
- [ ] Una excepción forzada en una fase devuelve E-599 con el formato de error y HTTP 500.
- [ ] `./run.sh` en un equipo limpio sirve la app completa en `http://localhost:8000`.
- [ ] `pytest --cov` reporta al menos 90% en `compilab/compiler`.

**Pruebas**

```python
def test_9_lineas_devuelven_E501():
    src = "\n".join(f"a{i} = {i}" for i in range(9))
    body = client.post("/api/compile", json={"source": src}).json()
    assert body["ok"] is False and body["error"]["code"] == "E-501"
    assert all(p["status"] == "skipped" for p in body["phases"])

def test_cuerpo_demasiado_grande():
    r = client.post("/api/compile", json={"source": "a = 1\n" * 2000})
    assert r.status_code == 413

def test_excepcion_inesperada_devuelve_E599(monkeypatch):
    def roto(*args, **kwargs):
        raise RuntimeError("boom")
    monkeypatch.setattr("compilab.compiler.pipeline.tokenize", roto)
    r = TestClient(app, raise_server_exceptions=False).post("/api/compile", json={"source": "a = 1"})
    assert r.status_code == 500 and r.json()["error"]["code"] == "E-599"

def test_los_logs_no_guardan_el_codigo(caplog):
    client.post("/api/compile", json={"source": "secreto = 123"})
    assert "secreto" not in caplog.text
```
