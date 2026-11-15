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
    expect(screen.getByText('print 11')).toBeInTheDocument();
  });
});
