import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { useCompileStore } from '../state/compileStore';
import okBasic from '../../../contract/fixtures/ok_basic.json';

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}

describe('Navegación y Guardias del Shell', () => {
  beforeEach(() => {
    useCompileStore.getState().reset();
  });

  it('la arena sin traza redirige al editor', () => {
    renderWithRouter(<App />, { route: '/arena' });
    expect(screen.getByRole('heading', { name: /editor/i })).toBeInTheDocument();
  });

  it('la arena con traza permite la entrada', () => {
    useCompileStore.getState().setTrace(okBasic as any);
    renderWithRouter(<App />, { route: '/arena' });
    expect(screen.getByRole('heading', { name: /arena/i })).toBeInTheDocument();
  });

  it('el editor se muestra por defecto en la ruta raíz', () => {
    renderWithRouter(<App />, { route: '/' });
    expect(screen.getByRole('heading', { name: /editor/i })).toBeInTheDocument();
  });
});
