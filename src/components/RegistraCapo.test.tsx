import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { RegistraCapo } from './RegistraCapo';
import { RegistroScreen } from './RegistroScreen';
import { VoceRegistro } from '../utils/registroAbbattimenti';

const soci = ['Rossi Mario', 'Bianchi Luca', 'Nicolò Verdi'];

describe('RegistraCapo', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('prima chiede il cacciatore, poi le note, poi salva', () => {
    const onSalva = vi.fn();
    const { getByText, getByLabelText } = render(
      <RegistraCapo titolo="Capriolo — FEMMINE" soci={soci} onSalva={onSalva} onAnnulla={() => {}} />,
    );
    fireEvent.click(getByText('Rossi Mario'));
    fireEvent.change(getByLabelText('Note'), { target: { value: '  ferito, ritrovato  ' } });
    fireEvent.click(getByText('Segna il capo'));
    expect(onSalva).toHaveBeenCalledWith('Rossi Mario', 'ferito, ritrovato');
  });

  it('le note possono restare vuote', () => {
    const onSalva = vi.fn();
    const { getByText } = render(
      <RegistraCapo titolo="t" soci={soci} onSalva={onSalva} onAnnulla={() => {}} />,
    );
    fireEvent.click(getByText('Bianchi Luca'));
    fireEvent.click(getByText('Segna il capo'));
    expect(onSalva).toHaveBeenCalledWith('Bianchi Luca', '');
  });

  it('la ricerca ignora maiuscole e accenti', () => {
    const { getByLabelText, queryByText } = render(
      <RegistraCapo titolo="t" soci={soci} onSalva={() => {}} onAnnulla={() => {}} />,
    );
    fireEvent.change(getByLabelText('Cerca il nome'), { target: { value: 'nicolo' } });
    expect(queryByText('Nicolò Verdi')).toBeTruthy();
    expect(queryByText('Rossi Mario')).toBeNull();
  });

  it('annullare non segna niente', () => {
    const onSalva = vi.fn();
    const onAnnulla = vi.fn();
    const { getByText } = render(
      <RegistraCapo titolo="t" soci={soci} onSalva={onSalva} onAnnulla={onAnnulla} />,
    );
    fireEvent.click(getByText('Annulla'));
    expect(onAnnulla).toHaveBeenCalled();
    expect(onSalva).not.toHaveBeenCalled();
  });

  it('durante il salvataggio il tasto non risponde a un secondo tocco', () => {
    const onSalva = vi.fn();
    const { getByText } = render(
      <RegistraCapo titolo="t" soci={soci} onSalva={onSalva} onAnnulla={() => {}} salvando />,
    );
    fireEvent.click(getByText('Rossi Mario'));
    fireEvent.click(getByText('Salvataggio…'));
    expect(onSalva).not.toHaveBeenCalled();
  });
});

describe('RegistroScreen', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  const oggi = new Date(2026, 9, 9, 20, 0);
  const voce = (o: Partial<VoceRegistro>): VoceRegistro => ({
    id: 'v', specieId: 'cervo', catId: 'cer_f', categoria: 'FEMMINE', zona: null,
    cacciatore: 'Rossi Mario', note: '', quando: new Date(2026, 9, 9, 7, 30), stagione: '2026', ...o,
  });

  it('mostra i capi di oggi e l’archivio', () => {
    const { container } = render(
      <RegistroScreen
        voci={[voce({ id: 'a' }), voce({ id: 'b', cacciatore: 'Bianchi Luca', quando: new Date(2026, 9, 1, 9, 0) })]}
        senzaRegistro={0} onBack={() => {}} oggi={oggi}
      />,
    );
    expect(container.textContent).toContain('Rossi Mario');
    expect(container.textContent).toContain('01/10/2026');
    expect(container.textContent).toContain('Bianchi Luca');
  });

  it('dice quanti capi sono stati segnati prima del registro', () => {
    const { container } = render(
      <RegistroScreen voci={[]} senzaRegistro={3} onBack={() => {}} oggi={oggi} />,
    );
    expect(container.textContent).toContain('3 capi della stagione sono stati segnati prima del registro');
    expect(container.textContent).toContain('Nessun capo segnato oggi.');
  });

  it('copia negli appunti le righe di oggi', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { getByText } = render(
      <RegistroScreen voci={[voce({ id: 'a' })]} senzaRegistro={0} onBack={() => {}} oggi={oggi} />,
    );
    fireEvent.click(getByText('Copia'));
    expect(writeText).toHaveBeenCalledWith('09/10/2026 07:30 — Rossi Mario — Cervo, FEMMINE');
  });
});
