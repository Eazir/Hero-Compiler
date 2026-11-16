import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { MAX_FRAGMENTS, programWithFragments } from '../domain/blocks';
import { EditorScreen } from '../features/editor/EditorScreen';
import { useProgramStore } from '../state/programStore';

describe('FE-2: Interfaz del Editor de Bloques Ampliado (Hero-Compiler)', () => {
  beforeEach(() => {
    useProgramStore.getState().loadDefaultExample();
  });

  test('renderiza la paleta con los fragmentos y el contador inicial en 12 / 36', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    expect(screen.getByText('Paleta de Fragmentos (7 tipos)')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`12 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();
    expect(screen.getByText('x (Variable)')).toBeInTheDocument();
    expect(screen.getByText('42 (Número)')).toBeInTheDocument();
    expect(screen.getByText('+ (Suma)')).toBeInTheDocument();
    expect(screen.getByText('x = expr')).toBeInTheDocument();
    expect(screen.getByText('print(expr)')).toBeInTheDocument();
  });

  test('al intentar superar el límite máximo de fragmentos muestra el mensaje de rechazo y motivo', () => {
    useProgramStore.getState().setProgram(programWithFragments(MAX_FRAGMENTS));

    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const varBlock = screen.getByText('x (Variable)');
    fireEvent.click(varBlock);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(new RegExp(`El fragmento ${MAX_FRAGMENTS + 1} fue rechazado`, 'i'));
    expect(alert).toHaveTextContent(new RegExp(`${MAX_FRAGMENTS} fragmentos`, 'i'));
  });

  test('permite limpiar el programa y agregar bloques con teclado (Enter)', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText(new RegExp(`0 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();

    const assignBlock = screen.getByText('x = expr');
    fireEvent.keyDown(assignBlock, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText(new RegExp(`2 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();
  });

  test('el botón Deshacer revierte la última modificación', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);
    expect(screen.getByText(new RegExp(`0 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();

    const undoBtn = screen.getByRole('button', { name: /deshacer/i });
    fireEvent.click(undoBtn);

    expect(screen.getByText(new RegExp(`12 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();
  });

  test('los números son directamente editables sin barra de spinner y actualizan el código fuente', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const numInputs = screen.getAllByLabelText(/editar valor numérico/i);
    expect(numInputs.length).toBeGreaterThan(0);
    // Verifica que es type="text" sin spinner nativo
    expect(numInputs[0]).toHaveAttribute('type', 'text');

    fireEvent.change(numInputs[0], { target: { value: '99' } });
    expect(screen.getByText(/a = 99/i)).toBeInTheDocument();
  });

  test('permite agregar múltiples bloques sucesivamente', () => {
    render(
      <BrowserRouter>
        <EditorScreen />
      </BrowserRouter>
    );

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    const addAssignBtn = screen.getByRole('button', { name: /\+ asignación/i });
    fireEvent.click(addAssignBtn);
    expect(screen.getByText(new RegExp(`2 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();

    const addAssignBtn2 = screen.getByRole('button', { name: /\+ asignación/i });
    fireEvent.click(addAssignBtn2);
    expect(screen.getByText(new RegExp(`4 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();

    const addPrintBtn = screen.getByRole('button', { name: /\+ print/i });
    fireEvent.click(addPrintBtn);
    expect(screen.getByText(new RegExp(`6 / ${MAX_FRAGMENTS} Fragmentos`, 'i'))).toBeInTheDocument();
  });
});
