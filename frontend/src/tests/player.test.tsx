import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import okBasic from '../../../contract/fixtures/ok_basic.json';
import { CompileResponse } from '../api/schema';
import { ArenaScreen } from '../features/arena/ArenaScreen';
import { useCompileStore } from '../state/compileStore';
import { usePlayerStore } from '../state/playerStore';

describe('FE-3: Reproductor de fases y animación 1 a 1 en la Arena', () => {
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

  test('en la fase semántica se visualiza la tabla de símbolos', () => {
    usePlayerStore.setState({ activePhase: 'semantic', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /tabla de símbolos/i })).toBeInTheDocument();
    expect(screen.getByText('Identificador')).toBeInTheDocument();
  });

  test('en la fase de código intermedio se visualizan las instrucciones TAC', () => {
    usePlayerStore.setState({ activePhase: 'ir', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/instrucciones de código intermedio/i)).toBeInTheDocument();
    expect(screen.getByText('t1 = b * 2')).toBeInTheDocument();
  });

  test('en la fase de optimización se visualiza la reducción de instrucciones', () => {
    usePlayerStore.setState({ activePhase: 'optimization', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/instrucciones optimizadas/i)).toBeInTheDocument();
    expect(screen.getAllByText('print 11').length).toBeGreaterThan(0);
  });

  test('en la fase de ensamblador y binario se visualizan AsmView y HexView', () => {
    usePlayerStore.setState({ activePhase: 'assembly', stepIndex: 0 });

    const { rerender } = render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/instrucciones de ensamblador isa/i)).toBeInTheDocument();
    expect(screen.getAllByText('LOADI R0, 11').length).toBeGreaterThan(0);

    usePlayerStore.setState({ activePhase: 'binary', stepIndex: 0 });
    rerender(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    expect(screen.getByText(/rejilla hexadecimal de 8 bytes/i)).toBeInTheDocument();
  });

  test('el mini-juego de Hero-Compiler permite jugar cada paso y abre la ventana de diagnóstico al equivocarse', () => {
    usePlayerStore.setState({ activePhase: 'lexical', stepIndex: 0 });

    render(
      <BrowserRouter>
        <ArenaScreen />
      </BrowserRouter>
    );

    // El primer token es "a" (ID). Si el usuario elige una opción errónea (ej. NUM), aparece el modal explicando qué error se cometió y qué se debió hacer
    const wrongBtn = screen.getByRole('button', { name: /NUM \(Constante numérica entera\)/i });
    fireEvent.click(wrongBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/¿Qué error se cometió\?/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué se debió hacer\?/i)).toBeInTheDocument();

    // Cerrar el modal y elegir la opción correcta (ID)
    const closeBtn = screen.getByRole('button', { name: /entendido, corregir paso/i });
    fireEvent.click(closeBtn);

    const rightBtn = screen.getByRole('button', { name: /ID \(Identificador de variable\)/i });
    fireEvent.click(rightBtn);

    // Avanza al Paso 2 del mini-juego
    expect(screen.getByText(/Progreso: 1 \//i)).toBeInTheDocument();
  });
});
