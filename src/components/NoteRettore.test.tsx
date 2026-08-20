import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { NoteRettore } from './NoteRettore';

const note = [
  { id: 'n1', data: '12/11/2026', testo: 'Tolto 1 yearling, aggiunta 1 femmina di prima' },
  { id: 'n2', data: '03/10/2026', testo: 'Zona Spora chiusa in anticipo per neve' },
];

describe('NoteRettore', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('mostra ogni annotazione con la sua data', () => {
    const { container } = render(
      <NoteRettore note={note} onAggiungi={() => {}} onRimuovi={() => {}} />,
    );

    expect(container.textContent).toContain('12/11/2026');
    expect(container.textContent).toContain('Tolto 1 yearling, aggiunta 1 femmina di prima');
    expect(container.textContent).toContain('03/10/2026');
  });

  it('col diario vuoto mostra comunque il tasto per scrivere', () => {
    const { getByLabelText } = render(
      <NoteRettore note={[]} onAggiungi={() => {}} onRimuovi={() => {}} />,
    );

    expect(getByLabelText('Aggiungi una nota')).toBeTruthy();
  });

  it('il campo per scrivere compare solo dopo aver toccato il tasto', () => {
    const { queryByRole, getByLabelText, getByRole } = render(
      <NoteRettore note={[]} onAggiungi={() => {}} onRimuovi={() => {}} />,
    );

    expect(queryByRole('textbox')).toBeNull();
    fireEvent.click(getByLabelText('Aggiungi una nota'));

    expect(getByRole('textbox')).toBeTruthy();
  });

  it('salva quello che hai scritto', () => {
    const onAggiungi = vi.fn();
    const { getByLabelText, getByRole, getByText } = render(
      <NoteRettore note={[]} onAggiungi={onAggiungi} onRimuovi={() => {}} />,
    );

    fireEvent.click(getByLabelText('Aggiungi una nota'));
    fireEvent.change(getByRole('textbox'), { target: { value: 'Piano rivisto' } });
    fireEvent.click(getByText('Salva'));

    expect(onAggiungi).toHaveBeenCalledWith('Piano rivisto');
  });

  it('chiude il campo dopo aver salvato', () => {
    const { getByLabelText, getByRole, getByText, queryByRole } = render(
      <NoteRettore note={[]} onAggiungi={() => {}} onRimuovi={() => {}} />,
    );

    fireEvent.click(getByLabelText('Aggiungi una nota'));
    fireEvent.change(getByRole('textbox'), { target: { value: 'Piano rivisto' } });
    fireEvent.click(getByText('Salva'));

    expect(queryByRole('textbox')).toBeNull();
  });

  it('non salva una nota vuota', () => {
    const onAggiungi = vi.fn();
    const { getByLabelText, getByRole, getByText } = render(
      <NoteRettore note={[]} onAggiungi={onAggiungi} onRimuovi={() => {}} />,
    );

    fireEvent.click(getByLabelText('Aggiungi una nota'));
    fireEvent.change(getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(getByText('Salva'));

    expect(onAggiungi).not.toHaveBeenCalled();
  });

  it('annullare butta via quello che stavi scrivendo', () => {
    const onAggiungi = vi.fn();
    const { getByLabelText, getByRole, getByText, queryByRole } = render(
      <NoteRettore note={[]} onAggiungi={onAggiungi} onRimuovi={() => {}} />,
    );

    fireEvent.click(getByLabelText('Aggiungi una nota'));
    fireEvent.change(getByRole('textbox'), { target: { value: 'ripensamento' } });
    fireEvent.click(getByText('Annulla'));

    expect(onAggiungi).not.toHaveBeenCalled();
    expect(queryByRole('textbox')).toBeNull();
  });

  it('prima di cancellare chiede conferma', () => {
    const onRimuovi = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { getAllByLabelText } = render(
      <NoteRettore note={note} onAggiungi={() => {}} onRimuovi={onRimuovi} />,
    );

    fireEvent.click(getAllByLabelText('Cancella questa nota')[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(onRimuovi).toHaveBeenCalledWith('n1');
  });

  it('se dici di no la nota resta', () => {
    const onRimuovi = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { getAllByLabelText } = render(
      <NoteRettore note={note} onAggiungi={() => {}} onRimuovi={onRimuovi} />,
    );

    fireEvent.click(getAllByLabelText('Cancella questa nota')[0]);

    expect(onRimuovi).not.toHaveBeenCalled();
  });
});
