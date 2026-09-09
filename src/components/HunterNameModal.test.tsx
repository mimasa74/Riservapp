import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { HunterNameModal } from './HunterNameModal';

// Mock locale: quello globale in test-setup non espone updateDoc.
const updateDoc = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>());
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  updateDoc,
}));
vi.mock('../firebase', () => ({ db: {} }));

const members = { nomi: ['Bruni Michele', 'Rossi Mario'], direttivo: [] };
const MIO = 'device-mio';

function entra(slots: Record<string, string>, nome = 'Rossi Mario') {
  const onConfirm = vi.fn();
  const view = render(
    <HunterNameModal members={members} slots={slots} deviceId={MIO} onConfirm={onConfirm} />,
  );
  fireEvent.change(view.container.querySelector('input')!, { target: { value: nome } });
  fireEvent.click(view.getByText('Entra'));
  return { ...view, onConfirm };
}

describe('HunterNameModal', () => {
  afterEach(() => { cleanup(); updateDoc.mockClear(); updateDoc.mockResolvedValue(undefined); });

  it('con lo slot libero lo occupa col proprio deviceId', async () => {
    const { onConfirm } = entra({});
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Rossi Mario'));
    expect(updateDoc).toHaveBeenCalledWith({}, { mariorossi: MIO });
  });

  // Le rules accettano solo l'AGGIUNTA di una chiave: riscrivere lo stesso
  // valore veniva rifiutato e il socio leggeva "Errore di connessione" per
  // sempre, senza poter rientrare col suo stesso telefono.
  it('se lo slot è già di questo telefono entra senza scrivere niente', async () => {
    const { onConfirm } = entra({ mariorossi: MIO });
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Rossi Mario'));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('se lo slot è di un altro telefono manda dal Rettore senza scrivere', () => {
    const { container, onConfirm } = entra({ mariorossi: 'device-altro' });
    expect(container.textContent).toContain('Nome già in uso da un altro dispositivo');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('un nome fuori dalla lista soci non passa', () => {
    const { container, onConfirm } = entra({}, 'Bianchi Luigi');
    expect(container.textContent).toContain('Nome non riconosciuto');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('il nome vale in qualunque ordine', async () => {
    const { onConfirm } = entra({}, 'mario  rossi');
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Rossi Mario'));
  });

  // permission-denied qui vuol dire che un altro telefono ha rivendicato lo
  // stesso nome nel frattempo: dire "Riprova" manderebbe il socio a cercare
  // la rete per un problema che la rete non ha.
  it('se lo slot viene rubato durante la scrittura non parla di connessione', async () => {
    updateDoc.mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    const { container } = entra({});
    await vi.waitFor(() =>
      expect(container.textContent).toContain('Nome già in uso da un altro dispositivo'),
    );
    expect(container.textContent).not.toContain('Errore di connessione');
  });

  it('un errore di rete vero resta un errore di rete', async () => {
    updateDoc.mockRejectedValue(Object.assign(new Error('offline'), { code: 'unavailable' }));
    const { container } = entra({});
    await vi.waitFor(() => expect(container.textContent).toContain('Errore di connessione'));
  });
});
