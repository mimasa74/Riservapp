import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav — bollino novità', () => {
  afterEach(() => cleanup());

  it('non mostra bollini se non ci sono capi nuovi', () => {
    const { queryAllByTestId } = render(
      <BottomNav currentScreenIndex={0} onNavigate={() => {}} novita={{}} />,
    );

    expect(queryAllByTestId('bollino-novita')).toHaveLength(0);
  });

  it('mostra un bollino sulla specie con capi nuovi', () => {
    const { getAllByTestId } = render(
      <BottomNav currentScreenIndex={0} onNavigate={() => {}} novita={{ cervo: 2 }} />,
    );

    const bollini = getAllByTestId('bollino-novita');
    expect(bollini).toHaveLength(1);
    expect(bollini[0].getAttribute('data-specie')).toBe('cervo');
  });

  it('il bollino non porta numeri, è solo una pastiglia rossa', () => {
    const { getByTestId } = render(
      <BottomNav currentScreenIndex={0} onNavigate={() => {}} novita={{ cervo: 7 }} />,
    );

    expect(getByTestId('bollino-novita').textContent).toBe('');
  });

  it('non mette il bollino sulla specie che il socio sta guardando', () => {
    const { queryAllByTestId } = render(
      <BottomNav currentScreenIndex={2} onNavigate={() => {}} novita={{ cervo: 2 }} />,
    );

    expect(queryAllByTestId('bollino-novita')).toHaveLength(0);
  });

  it('funziona anche senza la prop novita (schermate che non la passano)', () => {
    const { queryAllByTestId } = render(
      <BottomNav currentScreenIndex={0} onNavigate={() => {}} />,
    );

    expect(queryAllByTestId('bollino-novita')).toHaveLength(0);
  });
});
