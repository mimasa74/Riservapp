import { describe, it, expect } from 'vitest';
import {
  snapshotSpecie,
  capiSegnati,
  corpoRiepilogo,
  titoloRiepilogo,
} from './riepilogo';
import type { Categoria } from './index';

const cat = (id: string, abbattuti: number): Categoria => ({
  id,
  nome: id.toUpperCase(),
  abbattuti,
  totale: 6,
  stato: 'aperto',
});

describe('snapshotSpecie', () => {
  it('riduce le categorie a id → capi abbattuti', () => {
    expect(snapshotSpecie([cat('ce1', 2), cat('ce2', 0)])).toEqual({ ce1: 2, ce2: 0 });
  });

  it('una categoria senza il campo abbattuti vale zero', () => {
    const rotta = { id: 'ce3', nome: 'X', totale: 4, stato: 'aperto' } as Categoria;
    expect(snapshotSpecie([rotta])).toEqual({ ce3: 0 });
  });
});

describe('capiSegnati', () => {
  // La prima sera dopo l'installazione non c'è termine di paragone: tacere è
  // l'unica cosa onesta, altrimenti partirebbe un riepilogo di tutta la stagione.
  it('senza fotografia precedente non conta niente', () => {
    expect(capiSegnati(null, { ce1: 4 })).toBe(0);
  });

  it('somma i capi comparsi da ieri sera', () => {
    expect(capiSegnati({ ce1: 1, ce2: 0 }, { ce1: 3, ce2: 1 })).toBe(3);
  });

  it('una correzione in meno del Rettore non è un capo nuovo', () => {
    expect(capiSegnati({ ce1: 3 }, { ce1: 1 })).toBe(0);
  });

  it('un calo su una categoria non cancella la crescita di un\'altra', () => {
    expect(capiSegnati({ ce1: 3, ce2: 0 }, { ce1: 1, ce2: 2 })).toBe(2);
  });

  // Rinominare una categoria ne cambia l'id: i suoi capi non sono appena caduti.
  it('una categoria mai vista prima entra in silenzio', () => {
    expect(capiSegnati({ ce1: 1 }, { ce1: 1, ce9: 5 })).toBe(0);
  });

  it('azzerare la stagione non è una novità', () => {
    expect(capiSegnati({ ce1: 6, ce2: 4 }, { ce1: 0, ce2: 0 })).toBe(0);
  });

  // Guardia: una categoria cancellata dal piano non deve far scattare niente.
  // Il conto scorre le categorie di oggi, non quelle della fotografia — e la
  // fotografia stessa viene riscritta per intero (mergeFields in index.ts),
  // quindi la chiave sparisce alla prima corsa.
  it('una categoria cancellata dal piano non conta', () => {
    expect(capiSegnati({ ce1: 2, ce2: 3 }, { ce1: 2 })).toBe(0);
  });
});

describe('corpoRiepilogo', () => {
  it('accorda il singolare', () => {
    expect(corpoRiepilogo(1)).toBe('Segnato 1 capo');
  });

  it('accorda il plurale', () => {
    expect(corpoRiepilogo(3)).toBe('Segnati 3 capi');
  });
});

describe('titoloRiepilogo', () => {
  it('è la specie in maiuscolo', () => {
    expect(titoloRiepilogo('cervo', { nome: 'Cervo' })).toBe('CERVO');
  });

  // Il riepilogo abbraccia tutte le categorie della specie, quindi anche le due
  // zone del camoscio: nominarne una sola sarebbe falso.
  it('sul camoscio non nomina nessuna zona', () => {
    const camoscio = { nome: 'Camoscio', subZone: [{ nome: 'Campa - Spora' }, { nome: 'Tovel' }] };
    expect(titoloRiepilogo('camoscio', camoscio)).toBe('CAMOSCIO');
  });

  it('regge una specie senza nome', () => {
    expect(titoloRiepilogo('capriolo', {})).toBe('CAPRIOLO');
  });
});
