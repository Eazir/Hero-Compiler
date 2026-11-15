import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { EditorScreen } from '../features/editor/EditorScreen';
import { useProgramStore } from '../state/programStore';

describe('FE-2: Interfaz del Editor de Bloques', () => {
  beforeEach(() => {
    useProgramStore.getState().loadDefaultExample();
  });

  test('renderiza la paleta con los fragmentos y el contador inicial en 12', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    expect(screen.getByText('Paleta de Fragmentos (7 tipos)')).toBeInTheDocument();
    expect(screen.getByText(/12 \/ 12 Fragmentos/i)).toBeInTheDocument();
    expect(screen.getByText('x (Variable)')).toBeInTheDocument();
    expect(screen.getByText('42 (Número)')).toBeInTheDocument();
    expect(screen.getByText('+ (Suma)')).toBeInTheDocument();
    expect(screen.getByText('x = expr')).toBeInTheDocument();
    expect(screen.getByText('print(expr)')).toBeInTheDocument();
  });

  test('al intentar agregar el fragmento 13 muestra el mensaje de rechazo y motivo', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    // Con el ejemplo por defecto hay 12 fragmentos. La paleta está deshabilitada o rechaza al insertar
    const varBlock = screen.getByText('x (Variable)');
    fireEvent.click(varBlock);

    // Al haber 12 fragmentos, se muestra la alerta accesible con role="alert"
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/El fragmento 13 fue rechazado/i);
    expect(alert).toHaveTextContent(/12 fragmentos/i);
  });

  test('permite limpiar el programa y agregar bloques con teclado (Enter)', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    // Limpiar programa
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText(/0 \/ 12 Fragmentos/i)).toBeInTheDocument();

    // Seleccionar fragmento de asignación con teclado
    const assignBlock = screen.getByText('x = expr');
    fireEvent.keyDown(assignBlock, { key: 'Enter', code: 'Enter' });

    // Ahora hay fragmentos en el lienzo
    expect(screen.getByText(/2 \/ 12 Fragmentos/i)).toBeInTheDocument();
  });

  test('el botón Deshacer revierte la última modificación', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);
    expect(screen.getByText(/0 \/ 12 Fragmentos/i)).toBeInTheDocument();

    // Deshacer
    const undoBtn = screen.getByRole('button', { name: /deshacer/i });
    fireEvent.click(undoBtn);

    expect(screen.getByText(/12 \/ 12 Fragmentos/i)).toBeInTheDocument();
  });
});

