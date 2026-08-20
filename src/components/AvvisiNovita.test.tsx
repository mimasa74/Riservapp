import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AvvisiNovita } from './AvvisiNovita';
import { AvvisoNovita } from '../utils/novita';

const avviso = (over: Partial<AvvisoNovita> = {}): AvvisoNovita => ({
  specieId: 'cervo',
  nomeSpecie: 'Cervo',
  aggiornato: '20/08 ore 14:32',
  ...over,
});

describe('AvvisiNovita', () => {
  afterEach(() => cleanup());

  it('non occupa spazio in bacheca se non c è nulla di nuovo', () => {
    const { container } = render(<AvvisiNovita avvisi={[]} onApri={() => {}} />);

    expect(container.innerHTML).toBe('');
  });

  it('dice quale specie e quando il piano e_ stato aggiornato', () => {
    const { container } = render(<AvvisiNovita avvisi={[avviso()]} onApri={() => {}} />);

    expect(container.textContent).toContain('Cervo');
    expect(container.textContent).toContain('Aggiornamento piano');
    expect(container.textContent).toContain('20/08 ore 14:32');
  });

  it('non nomina i capi ne_ le categorie', () => {
    const { container } = render(<AvvisiNovita avvisi={[avviso()]} onApri={() => {}} />);

    expect(container.textContent).not.toMatch(/cap[oi]/i);
  });

  it('senza data mostra comunque la riga dell_aggiornamento', () => {
    const { container } = render(
      <AvvisiNovita avvisi={[avviso({ aggiornato: undefined })]} onApri={() => {}} />,
    );

    expect(container.textContent).toContain('Aggiornamento piano');
  });

  it('porta al piano di abbattimento della specie', () => {
    const onApri = vi.fn();
    const { getByRole } = render(<AvvisiNovita avvisi={[avviso()]} onApri={onApri} />);

    fireEvent.click(getByRole('button'));

    expect(onApri).toHaveBeenCalledWith('cervo');
  });

  it('mostra un riquadro per ogni specie con novità', () => {
    const { getAllByRole } = render(
      <AvvisiNovita
        avvisi={[avviso(), avviso({ specieId: 'camoscio', nomeSpecie: 'Camoscio' })]}
        onApri={() => {}}
      />,
    );

    expect(getAllByRole('button')).toHaveLength(2);
  });
});
