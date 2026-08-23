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

// Il caso reale: un socio abbatte un camoscio di seconda classe mentre la classe
// è sospesa. Il Rettore deve poterlo segnare lo stesso, e il socio deve vedere il
// capo caduto senza vedere il piano — che per lui resta sospeso.

describe('CategoryRow — capi abbattuti in classe sospesa', () => {
  afterEach(() => cleanup());

  const sospesa = (over: Partial<Categoria> = {}) =>
    categoria({ nome: 'Maschi di seconda classe', badgeChiusura: 'CHIUSI', stato: 'sospeso', totale: 5, abbattuti: 2, ...over });

  it('al socio mostra solo i capi abbattuti, non i quadratini del piano', () => {
    const { queryAllByTestId } = render(
      <CategoryRow cat={sospesa()} onToggle={() => {}} isAdmin={false} />,
    );

    expect(queryAllByTestId('casella')).toHaveLength(2);
  });

  it('al Rettore mostra tutti i quadratini del piano, da crociare', () => {
    const { queryAllByTestId } = render(
      <CategoryRow cat={sospesa()} onToggle={() => {}} isAdmin={true} />,
    );

    expect(queryAllByTestId('casella')).toHaveLength(5);
  });

  it('senza capi abbattuti il socio vede la sola scritta SOSPESI', () => {
    const { container, queryAllByTestId } = render(
      <CategoryRow cat={sospesa({ abbattuti: 0 })} onToggle={() => {}} isAdmin={false} />,
    );

    expect(queryAllByTestId('casella')).toHaveLength(0);
    expect(container.textContent).toContain('SOSPESI');
  });

  it('la croce del capo è arancione come la scritta SOSPESI', () => {
    const { queryAllByTestId } = render(
      <CategoryRow cat={sospesa()} onToggle={() => {}} isAdmin={false} />,
    );

    const croce = queryAllByTestId('capo-abbattuto')[0];
    expect(croce.querySelector('line')?.getAttribute('stroke')).toBe('#B8730A');
  });

  it('il capo appena segnato resta rosso, come in ogni altra classe', () => {
    const { queryAllByTestId } = render(
      <CategoryRow cat={sospesa()} onToggle={() => {}} isAdmin={false} capiNuovi={1} />,
    );

    const nuovo = queryAllByTestId('capo-nuovo')[0];
    expect(nuovo.querySelector('line')?.getAttribute('stroke')).toBe('#8B1A1A');
  });

  it('mostra la pastiglia NUOVO anche su una categoria sospesa', () => {
    const { container } = render(
      <CategoryRow cat={sospesa()} onToggle={() => {}} isAdmin={false} capiNuovi={1} />,
    );

    expect(container.textContent).toContain('NUOVO');
  });

  it('il socio non tocca i quadratini: il tocco è solo del Rettore', () => {
    let toccato = false;
    const { queryAllByTestId } = render(
      <CategoryRow cat={sospesa()} onToggle={() => { toccato = true; }} isAdmin={false} />,
    );

    queryAllByTestId('casella')[0].click();
    expect(toccato).toBe(false);
  });
});
