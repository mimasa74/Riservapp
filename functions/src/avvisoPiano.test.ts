import { describe, it, expect } from 'vitest';
import {
  capiComparsi,
  sommaDelta,
  corpoAvviso,
  deveInviare,
  QUIETE_MS,
  SILENZIO_MS,
} from './avvisoPiano';
import type { Categoria } from './index';

const cat = (id: string, abbattuti: number): Categoria => ({
  id,
  nome: id.toUpperCase(),
  abbattuti,
  totale: 6,
  stato: 'aperto',
});

describe('capiComparsi', () => {
  it('conta i capi segnati in questa scrittura', () => {
    expect(capiComparsi([cat('ce1', 1), cat('ce2', 0)], [cat('ce1', 3), cat('ce2', 1)])).toBe(3);
  });

  // Una correzione in meno del Rettore non è un capo caduto, e l'azzeramento di
  // stagione accenderebbe una notifica con tutta la stagione dentro.
  it('una correzione in meno non è un capo nuovo', () => {
    expect(capiComparsi([cat('ce1', 3)], [cat('ce1', 1)])).toBe(0);
  });

  it('i cali di una categoria non mangiano i capi di un\'altra', () => {
    expect(capiComparsi([cat('ce1', 3), cat('ce2', 0)], [cat('ce1', 1), cat('ce2', 2)])).toBe(2);
  });

  // È il caso della pubblicazione del piano: senza termine di paragone
  // annuncerebbe capi che nessuno ha abbattuto.
  it('una categoria mai vista prima entra in silenzio', () => {
    expect(capiComparsi([], [cat('ce1', 4)])).toBe(0);
  });

  // Aggiungendo o togliendo una classe gli indici slittano: l'accoppiamento è per id.
  it('accoppia per id, non per posizione', () => {
    expect(capiComparsi([cat('ce2', 1)], [cat('ce1', 0), cat('ce2', 2)])).toBe(1);
  });

  it('una categoria senza il campo abbattuti vale zero', () => {
    const rotta = { id: 'ce1', nome: 'X', totale: 4, stato: 'aperto' } as Categoria;
    expect(capiComparsi([rotta], [cat('ce1', 2)])).toBe(2);
  });
});

describe('sommaDelta', () => {
  it('somma i capi già in attesa con quelli nuovi', () => {
    expect(sommaDelta({ capriolo: 2 }, { capriolo: 1, cervo: 1 })).toEqual({ capriolo: 3, cervo: 1 });
  });

  it('senza niente in attesa tiene solo i nuovi', () => {
    expect(sommaDelta(undefined, { camoscio: 1 })).toEqual({ camoscio: 1 });
  });

  it('scarta le specie a zero invece di scriverle nel documento', () => {
    expect(sommaDelta({ cervo: 0 }, { capriolo: 1 })).toEqual({ capriolo: 1 });
  });
});

describe('corpoAvviso', () => {
  const config = {
    capriolo: { nome: 'Capriolo' },
    cervo: { nome: 'Cervo' },
    camoscio: { nome: 'Camoscio' },
  };

  it('elenca le specie nell\'ordine della BottomNav, non in quello dei capi', () => {
    expect(corpoAvviso({ camoscio: 1, cervo: 1, capriolo: 3 }, config))
      .toBe('Capriolo +3, Cervo +1, Camoscio +1');
  });

  it('nomina solo le specie cambiate', () => {
    expect(corpoAvviso({ camoscio: 1 }, config)).toBe('Camoscio +1');
  });

  // Il conto abbraccia tutte le categorie del camoscio, quindi entrambe le
  // subzone: nominarne una sarebbe falso.
  it('il camoscio non nomina la zona', () => {
    const conZone = { camoscio: { nome: 'Camoscio', subZone: [{ nome: 'Campa - Spora' }] } };
    expect(corpoAvviso({ camoscio: 2 }, conZone)).toBe('Camoscio +2');
  });

  it('senza config usa il nome di riserva della specie', () => {
    expect(corpoAvviso({ cervo: 1 }, {})).toBe('Cervo +1');
  });
});

describe('deveInviare', () => {
  const ora = 1_000_000_000;
  const finita = ora - QUIETE_MS - 1;

  it('aspetta finché il Rettore sta ancora segnando', () => {
    expect(deveInviare({ cervo: 1 }, ora - 60_000, undefined, ora)).toBe(false);
  });

  it('parte quando la sessione è finita', () => {
    expect(deveInviare({ cervo: 1 }, finita, undefined, ora)).toBe(true);
  });

  it('senza capi in attesa non parte niente', () => {
    expect(deveInviare({}, finita, undefined, ora)).toBe(false);
  });

  it('un conto azzerato non fa partire una notifica vuota', () => {
    expect(deveInviare({ cervo: 0 }, finita, undefined, ora)).toBe(false);
  });

  // I 15 minuti di silenzio: il conto continua a crescere, ma i soci non
  // ricevono due notifiche appiccicate.
  it('tace se la notifica precedente è troppo recente', () => {
    expect(deveInviare({ cervo: 1 }, finita, ora - SILENZIO_MS + 1000, ora)).toBe(false);
  });

  it('riparte passati i minuti di silenzio', () => {
    expect(deveInviare({ cervo: 1 }, finita, ora - SILENZIO_MS - 1, ora)).toBe(true);
  });

  it('senza l\'ora dell\'ultima crocetta non parte niente', () => {
    expect(deveInviare({ cervo: 1 }, undefined, undefined, ora)).toBe(false);
  });
});
