import { describe, it, expect, beforeEach } from 'vitest';
import {
  snapshotDaSpecie,
  contaCapiNuovi,
  incrementiPerCategoria,
  avvisiDaNovita,
  leggiSnapshot,
  salvaSnapshot,
} from './novita';
import { SpecieData } from '../types';

const specie = (
  categorie: { id: string; abbattuti: number }[],
  lastUpdated?: string,
): SpecieData => ({
  id: 'cervo',
  nome: 'Cervo',
  nomeInglese: 'Red deer',
  logoUrl: '',
  categorie: categorie.map(c => ({
    id: c.id,
    nome: c.id.toUpperCase(),
    badgeChiusura: 'CHIUSI',
    totale: 10,
    abbattuti: c.abbattuti,
    stato: 'aperto' as const,
  })),
  note: '',
  alert: '',
  ruota: {},
  lastUpdated,
});

describe('snapshotDaSpecie', () => {
  it('riduce la specie a una mappa catId → abbattuti', () => {
    const snap = snapshotDaSpecie(specie([
      { id: 'cer_femmine', abbattuti: 3 },
      { id: 'cer_fusoni', abbattuti: 0 },
    ]));

    expect(snap).toEqual({ cer_femmine: 3, cer_fusoni: 0 });
  });
});

describe('contaCapiNuovi', () => {
  it('non segnala nulla al primo avvio (nessuna fotografia precedente)', () => {
    expect(contaCapiNuovi(null, { cer_femmine: 4 })).toBe(0);
  });

  it('somma gli incrementi di tutte le categorie', () => {
    const prev = { cer_femmine: 1, cer_fusoni: 0 };
    const curr = { cer_femmine: 3, cer_fusoni: 1 };

    expect(contaCapiNuovi(prev, curr)).toBe(3);
  });

  it('ignora le correzioni in meno del Rettore', () => {
    expect(contaCapiNuovi({ cer_femmine: 3 }, { cer_femmine: 1 })).toBe(0);
  });

  it('non segnala nulla quando la nuova stagione azzera tutto', () => {
    const prev = { cer_femmine: 4, cer_fusoni: 2 };
    const curr = { cer_femmine: 0, cer_fusoni: 0 };

    expect(contaCapiNuovi(prev, curr)).toBe(0);
  });

  it('registra in silenzio una categoria mai vista prima', () => {
    const prev = { cer_femmine: 1 };
    const curr = { cer_femmine: 1, cer_fusoni: 2 };

    expect(contaCapiNuovi(prev, curr)).toBe(0);
  });

  it('conta solo l_incremento quando una categoria cresce e un_altra cala', () => {
    const prev = { cer_femmine: 1, cer_fusoni: 3 };
    const curr = { cer_femmine: 2, cer_fusoni: 1 };

    expect(contaCapiNuovi(prev, curr)).toBe(1);
  });
});

describe('incrementiPerCategoria', () => {
  it('elenca solo le categorie cresciute, con quanti capi sono nuovi', () => {
    const prev = { cer_femmine: 1, cer_fusoni: 3, cer_maschi: 0 };
    const curr = { cer_femmine: 3, cer_fusoni: 1, cer_maschi: 0 };

    expect(incrementiPerCategoria(prev, curr)).toEqual({ cer_femmine: 2 });
  });

  it('resta vuoto al primo avvio', () => {
    expect(incrementiPerCategoria(null, { cer_femmine: 4 })).toEqual({});
  });
});

describe('fotografia su localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('rilegge quello che ha salvato', () => {
    salvaSnapshot('cervo', { cer_femmine: 2 });

    expect(leggiSnapshot('cervo')).toEqual({ cer_femmine: 2 });
  });

  it('tiene separate le specie', () => {
    salvaSnapshot('cervo', { cer_femmine: 2 });

    expect(leggiSnapshot('camoscio')).toBeNull();
  });

  it('restituisce null se non ha mai salvato per quella specie', () => {
    expect(leggiSnapshot('capriolo')).toBeNull();
  });

  it('restituisce null se il valore salvato e_ illeggibile', () => {
    localStorage.setItem('riservapp_novita_cervo', '{rotto');

    expect(leggiSnapshot('cervo')).toBeNull();
  });

  it('restituisce null se il valore salvato non e_ una mappa di numeri', () => {
    localStorage.setItem('riservapp_novita_cervo', '["cer_femmine"]');

    expect(leggiSnapshot('cervo')).toBeNull();
  });
});

describe('avvisiDaNovita', () => {
  const dati = {
    cervo: specie(
      [{ id: 'cer_femmine', abbattuti: 3 }, { id: 'cer_fusoni', abbattuti: 1 }],
      '20/08 ore 14:32',
    ),
    camoscio: specie([{ id: 'cam1_m1', abbattuti: 2 }], '19/08 ore 09:10'),
  };

  it('salta le specie senza capi nuovi', () => {
    const avvisi = avvisiDaNovita(dati, { cervo: { capi: 2, categorie: { cer_femmine: 2 } } });

    expect(avvisi.map(a => a.specieId)).toEqual(['cervo']);
  });

  it('porta il nome della specie e quando il piano e_ stato aggiornato', () => {
    const [avviso] = avvisiDaNovita(dati, { cervo: { capi: 2, categorie: { cer_femmine: 2 } } });

    expect(avviso.nomeSpecie).toBe('Cervo');
    expect(avviso.aggiornato).toBe('20/08 ore 14:32');
  });

  it('lascia la data vuota se la specie non l_ha mai registrata', () => {
    const senzaData = { cervo: specie([{ id: 'cer_femmine', abbattuti: 3 }]) };

    const [avviso] = avvisiDaNovita(senzaData, {
      cervo: { capi: 2, categorie: { cer_femmine: 2 } },
    });

    expect(avviso.aggiornato).toBeUndefined();
  });

  it('resta vuoto quando non c_e_ nulla di nuovo', () => {
    expect(avvisiDaNovita(dati, { cervo: { capi: 0, categorie: {} } })).toEqual([]);
  });
});
