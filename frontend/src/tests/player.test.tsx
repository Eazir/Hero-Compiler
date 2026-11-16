import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import okBasic from '../../../contract/fixtures/ok_basic.json';
import { CompileResponse } from '../api/schema';
import { ArenaScreen } from '../features/arena/ArenaScreen';
import { useCompileStore } from '../state/compileStore';
import { usePlayerStore } from '../state/playerStore';

describe('FE-3 y FE-8: Reproductor, Mini-Juegos Arcade (Fases 1-6) y Escritorio en Fase 7', () => {
  const parsedTrace = CompileResponse.parse(okBasic);

  beforeEach(() => {
    useCompileStore.setState({ trace: parsedTrace, status: 'done', errorMessage: null });
    usePlayerStore.setState({
      activePhase: 'lexical',
      stepIndex: 0,
      isPlaying: false,
      speed: 1,
    });
  });

  test('renderiza el reproductor, la barra de progreso y el panel de explicación accesible', () => {
    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByRole('region', { name: /controles del reproductor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/panel de explicación/i)).toHaveAttribute('aria-live', 'polite');
    expect(screen.getAllByText(/Paso 1 de/i).length).toBeGreaterThan(0);
  });

  test('avanzar de paso 1 a 1 actualiza la explicación y el contador', () => {
    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    expect(screen.getAllByText(/Paso 1 de/i).length).toBeGreaterThan(0);

    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/Paso 2 de/i).length).toBeGreaterThan(0);
  });

  test('cambiar de velocidad en el reproductor actualiza el estado', () => {
    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    const speed2xBtn = screen.getByRole('button', { name: '2×' });
    fireEvent.click(speed2xBtn);
    expect(usePlayerStore.getState().speed).toBe(2);
  });

  test('en la fase semántica se visualiza la tabla de símbolos y el Laberinto Symbol Maze', () => {
    usePlayerStore.setState({ activePhase: 'semantic', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /tabla de símbolos/i })).toBeInTheDocument();
    expect(screen.getByText(/LABERINTO MULTICAMINO 6x6/i)).toBeInTheDocument();
  });

  test('en la fase de código intermedio se visualizan las instrucciones TAC y el juego Post-Order Sniper', () => {
    usePlayerStore.setState({ activePhase: 'ir', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/instrucciones de código intermedio/i)).toBeInTheDocument();
    expect(screen.getByText(/CAMPO DE TIRO POST-ORDER SNIPER/i)).toBeInTheDocument();
  });

  test('en la fase de optimización se visualiza la reducción y el juego Optimizer Tower Defense', () => {
    usePlayerStore.setState({ activePhase: 'optimization', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/instrucciones optimizadas/i)).toBeInTheDocument();
    expect(screen.getByText(/TOWER DEFENSE DEL OPTIMIZADOR/i)).toBeInTheDocument();
  });

  test('la fase 7 (binary) NO tiene mini-juego y muestra el binario junto al Escritorio Virtual con programa.exe y Consola', () => {
    usePlayerStore.setState({ activePhase: 'binary', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // No debe haber mini-juego en la fase 7
    expect(screen.queryByRole('region', { name: /mini-juego arcade/i })).not.toBeInTheDocument();

    // Muestra la rejilla hexadecimal y el Escritorio Virtual
    expect(screen.getByText(/rejilla hexadecimal de 8 bytes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Escritorio Virtual Hero-OS/i)).toBeInTheDocument();

    // Al hacer clic en programa.exe se abre la consola y muestra la salida '11'
    const exeBtns = screen.getAllByRole('button', { name: /Ejecutar programa\.exe/i });
    fireEvent.click(exeBtns[0]);

    const consoleLog = screen.getByRole('log', { name: /salida de consola/i });
    expect(consoleLog).toHaveTextContent('11');
  });

  test('el mini-juego Space Lexer dispara láseres y abre la ventana de diagnóstico si usas el cañón equivocado', () => {
    usePlayerStore.setState({ activePhase: 'lexical', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // El primer meteorito es "a" (ID). Si disparamos con el Cañón NUM, rebota y abre la ventana de error
    const wrongCannonBtn = screen.getByRole('button', { name: /Cañón NUM/i });
    fireEvent.click(wrongCannonBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/¿Qué error se cometió\?/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué se debió hacer\?/i)).toBeInTheDocument();

    // Cerramos la ventana modal y disparamos con el Cañón ID correcto
    fireEvent.click(screen.getByRole('button', { name: /entendido, corregir paso/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cañón ID/i }));

    expect(screen.getByText(/Progreso: 1/i)).toBeInTheDocument();
  });

  test('Space Lexer responde a controles de teclado (Flechas, Tab, Espacio) y los botones no tienen descripción de ayuda', () => {
    usePlayerStore.setState({ activePhase: 'lexical', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // 1. Verificamos que los botones de cañones solo muestran el nombre y no la descripción
    const cannonIdButtons = screen.getAllByRole('button', { name: /Cañón ID/i });
    const cannonIdBtn = cannonIdButtons[cannonIdButtons.length - 1];
    expect(cannonIdBtn).toBeInTheDocument();
    expect(cannonIdBtn).not.toHaveTextContent('Variables como a, b, c');

    const cannonNumBtn = screen.getByRole('button', { name: /Cañón NUM/i });
    expect(cannonNumBtn).not.toHaveTextContent('Números enteros');

    // 2. Control con teclado: Mover con ArrowRight y disparar con Espacio
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // Al estar en el carril 2 (donde no está el token 'a' que cae en carril 1), disparar con Espacio dispara al vacío
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Disparo en Carril Vacío/i)).toBeInTheDocument();

    // Cerramos el modal
    fireEvent.click(screen.getByRole('button', { name: /entendido, corregir paso/i }));

    // 3. Regresar con ArrowLeft al carril 1 y cambiar de cañón con Tab
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Tab' }); // cambia a NUM
    // Dispara al meteorito 'a' (ID) con cañón NUM -> error de clasificación
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/El rayo láser rebotó en el escudo magnético/i)).toBeInTheDocument();
  });

  test('Symbol Maze 6x6 responde a las flechas del teclado, detecta atajo trampa E-301 y recoge llaves', () => {
    usePlayerStore.setState({ activePhase: 'semantic', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // 1. Probar bifurcación #1: atajo tentador en fila 0 hacia (0, 5) con trampa z_undef (E-301)
    // El dron empieza en (0, 0).
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // (0, 1)
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // (0, 2) - Bifurcación #1
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // (0, 3)
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // (0, 4)
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // (0, 5) - Trampa z_undef

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Variable No Declarada \(E-301\)/i)).toBeInTheDocument();

    // Cerramos el modal de error
    fireEvent.click(screen.getByRole('button', { name: /entendido, corregir paso/i }));

    // 2. Ruta legítima hacia la llave 'a' en (1, 1):
    // Desde (0, 4) regresamos hacia (0, 2), bajamos a (1, 2) y vamos a (1, 1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); // (0, 3)
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); // (0, 2)
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // (1, 2)
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); // (1, 1) - Llave Declarar 'a'

    expect(screen.getByText(/Llaves en Tabla: \[a\]/i)).toBeInTheDocument();
  });

  test('AST Crane Builder (Fase 2) renderiza la grúa mecánica y previene izar la raíz antes que los hijos', () => {
    usePlayerStore.setState({ activePhase: 'syntactic', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/GRÚA MECÁNICA AST/i)).toBeInTheDocument();

    // Intentar izar el Nodo Raíz [a = ...] antes de la Hoja Terminal [5] dispara error de jerarquía AST
    const rootCrateBtn = screen.getByRole('button', { name: /Nodo Raíz/i });
    fireEvent.click(rootCrateBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Error de Jerarquía AST/i)).toBeInTheDocument();
  });

  test('Post-Order Sniper (Fase 4) no tiene dianas duplicadas ni el señuelo t_pre y permite derribar en orden TAC', () => {
    usePlayerStore.setState({ activePhase: 'ir', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // Verificamos que el señuelo falso de la imagen 1 fue eliminado por completo
    expect(screen.queryByText(/t_pre/i)).not.toBeInTheDocument();

    // Verificamos que la diana del paso 0 está presente en la galería
    const allButtons = screen.getAllByRole('button');
    const firstTargetBtn = allButtons.find((btn) => btn.textContent?.includes('DISPARAR') && btn.textContent?.includes('a = 5'));
    expect(firstTargetBtn).toBeDefined();

    // Verificamos que no se duplica la misma diana
    const countA5 = allButtons.filter((btn) => btn.textContent?.includes('a = 5')).length;
    expect(countA5).toBe(1);

    // Disparar a la primera diana legítima avanza el progreso
    if (firstTargetBtn) {
      fireEvent.click(firstTargetBtn);
      expect(screen.getByText(/Dianas Derribadas: 1/i)).toBeInTheDocument();
    }
  });

  test('Ensamblador ISA (Fase 6) exige seleccionar manualmente el registro antes de despachar el opcode', () => {
    usePlayerStore.setState({ activePhase: 'assembly', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // Si intentamos despachar LOADI sin haber seleccionado R0 (empieza en SIN REG), abre modal de error
    const loadiBtn = screen.getByRole('button', { name: /^LOADI/i });
    fireEvent.click(loadiBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Banco de Registros en Ciclo/i)).toBeInTheDocument();

    // Cerramos el modal, seleccionamos R0 manualmente y despachamos LOADI
    fireEvent.click(screen.getByRole('button', { name: /entendido, corregir paso/i }));
    fireEvent.click(screen.getByRole('button', { name: 'R0' }));
    fireEvent.click(screen.getByRole('button', { name: /^LOADI/i }));

    expect(screen.getByText(/Progreso: 1/i)).toBeInTheDocument();
  });
});
