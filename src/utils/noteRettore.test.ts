import { describe, it, expect } from 'vitest';
import {
  formatDataNota,
  creaNota,
  aggiungiNota,
  rimuoviNota,
  noteDiSpecie,
} from './noteRettore';

describe('formatDataNota', () => {
  it('scrive giorno, mese e anno con lo zero davanti', () => {
    expect(formatDataNota(new Date(2026, 10, 3))).toBe('03/11/2026');
  });

  it('tiene l_anno per esteso: le note si rileggono fra una stagione e l_altra', () => {
    expect(formatDataNota(new Date(2027, 0, 15))).toBe('15/01/2027');
  });
});

describe('creaNota', () => {
  it('porta testo e data del giorno', () => {
    const nota = creaNota('  tolto 1 yearling  ', new Date(2026, 10, 12));

    expect(nota.testo).toBe('tolto 1 yearling');
    expect(nota.data).toBe('12/11/2026');
  });

  it('da_ a ogni nota un id suo', () => {
    const a = creaNota('prima', new Date());
    const b = creaNota('seconda', new Date());

    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});

describe('aggiungiNota', () => {
  it('mette la nota nuova in cima, le vecchie restano sotto', () => {
    const vecchia = creaNota('vecchia', new Date(2026, 9, 3));
    const nuova = creaNota('nuova', new Date(2026, 10, 12));

    expect(aggiungiNota([vecchia], nuova).map(n => n.testo)).toEqual(['nuova', 'vecchia']);
  });

  it('parte anche da un diario vuoto', () => {
    const nota = creaNota('prima annotazione', new Date());

    expect(aggiungiNota([], nota)).toHaveLength(1);
  });
});

describe('rimuoviNota', () => {
  it('toglie solo quella che gli chiedi', () => {
    const a = creaNota('a', new Date());
    const b = creaNota('b', new Date());

    expect(rimuoviNota([a, b], a.id).map(n => n.testo)).toEqual(['b']);
  });

  it('non cambia niente se l_id non c_e_ piu_', () => {
    const a = creaNota('a', new Date());

    expect(rimuoviNota([a], 'sparito')).toHaveLength(1);
  });
});

describe('noteDiSpecie', () => {
  const nota = { id: 'n1', data: '12/11/2026', testo: 'tolto 1 yearling' };

  it('legge il diario della specie chiesta', () => {
    expect(noteDiSpecie({ camoscio: [nota] }, 'camoscio')).toEqual([nota]);
  });

  it('tiene separate le specie', () => {
    expect(noteDiSpecie({ camoscio: [nota] }, 'cervo')).toEqual([]);
  });

  it('regge un documento che non esiste ancora', () => {
    expect(noteDiSpecie(null, 'cervo')).toEqual([]);
  });

  it('scarta le voci malformate invece di far saltare la schermata', () => {
    const sporco = { cervo: [nota, { id: 'n2' }, 'stringa', null] };

    expect(noteDiSpecie(sporco, 'cervo')).toEqual([nota]);
  });

  it('regge un campo che non e_ una lista', () => {
    expect(noteDiSpecie({ cervo: 'rotto' }, 'cervo')).toEqual([]);
  });
});
