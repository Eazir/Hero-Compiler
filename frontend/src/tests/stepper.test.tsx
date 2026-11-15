import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseStepper } from '../features/arena/PhaseStepper';
import { PHASES_META } from '../domain/phases';

describe('PhaseStepper Component', () => {
  it('el stepper marca activa, completa y bloqueada', () => {
    render(
      <PhaseStepper
        phases={PHASES_META}
        active="syntactic"
        done={['lexical']}
      />
    );

    const syntacticItem = screen.getByText('Análisis Sintáctico').closest('li');
    expect(syntacticItem).toHaveAttribute('aria-current', 'step');
    expect(syntacticItem).toHaveAttribute('data-state', 'active');

    const lexicalItem = screen.getByText('Análisis Léxico').closest('li');
    expect(lexicalItem).toHaveAttribute('data-state', 'done');
    expect(lexicalItem).not.toHaveAttribute('aria-current');

    const semanticItem = screen.getByText('Análisis Semántico').closest('li');
    expect(semanticItem).toHaveAttribute('data-state', 'locked');
  });

  it('el stepper marca fase con error', () => {
    render(
      <PhaseStepper
        phases={PHASES_META}
        active="semantic"
        done={['lexical', 'syntactic']}
        errorPhase="semantic"
      />
    );

    const semanticItem = screen.getByText('Análisis Semántico').closest('li');
    expect(semanticItem).toHaveAttribute('data-state', 'error');
  });
});
