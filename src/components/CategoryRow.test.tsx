import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CategoryRow } from './CategoryRow';
import { Categoria } from '../types';

const categoria = (over: Partial<Categoria> = {}): Categoria => ({
  id: 'cer_femmine',
  nome: 'Femmine',
  badgeChiusura: 'CHIUSE',
  totale: 6,
  abbattuti: 3,
  stato: 'aperto',
  ...over,
});

describe('CategoryRow — capi nuovi', () => {
  afterEach(() => cleanup());

  it('mostra la pastiglia NUOVO sulla categoria cresciuta', () => {
    const { container } = render(
      <CategoryRow cat={categoria()} onToggle={() => {}} isAdmin={false} capiNuovi={2} />,
    );

    expect(container.textContent).toContain('NUOVO');
  });

  it('niente pastiglia se la categoria non è cresciuta', () => {
    const { container } = render(
      <CategoryRow cat={categoria()} onToggle={() => {}} isAdmin={false} capiNuovi={0} />,
    );

    expect(container.textContent).not.toContain('NUOVO');
  });

  it('segna in rosso solo i capi appena registrati', () => {
    const { queryAllByTestId } = render(
      <CategoryRow cat={categoria({ abbattuti: 3 })} onToggle={() => {}} isAdmin={false} capiNuovi={2} />,
    );

    expect(queryAllByTestId('capo-nuovo')).toHaveLength(2);
  });

  it('senza la prop capiNuovi la riga resta quella di sempre', () => {
    const { container, queryAllByTestId } = render(
      <CategoryRow cat={categoria()} onToggle={() => {}} isAdmin={false} />,
    );

    expect(container.textContent).not.toContain('NUOVO');
    expect(queryAllByTestId('capo-nuovo')).toHaveLength(0);
  });

  it('mostra la pastiglia anche su una categoria chiusa', () => {
    const { container } = render(
      <CategoryRow
        cat={categoria({ stato: 'chiuso', abbattuti: 6 })}
        onToggle={() => {}}
        isAdmin={false}
        capiNuovi={1}
      />,
    );

    expect(container.textContent).toContain('NUOVO');
  });
});
