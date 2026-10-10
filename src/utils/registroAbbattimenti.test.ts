import { describe, it, expect } from 'vitest';
import {
  VoceRegistro, azioneTocco, zonaDi, stagioneDi, voceDaDocumento, ultimaVoceDi,
  vociDelGiorno, vociPerGiorno, rigaReport, testoReport, capiSenzaRegistro,
} from './registroAbbattimenti';

const voce = (o: Partial<VoceRegistro>): VoceRegistro => ({
  id: 'v', specieId: 'capriolo', catId: 'cap_m1', categoria: 'MASCHI DI PRIMA CLASSE',
  zona: null, cacciatore: 'Rossi Mario', note: '', quando: new Date(2026, 9, 9, 7, 30),
  stagione: '2026', ...o,
});

describe('azioneTocco', () => {
  it('un quadratino vuoto aggiunge un capo solo, anche se è lontano', () => {
    expect(azioneTocco({ abbattuti: 2, totale: 6 }, 2)).toBe('aggiungi');
    expect(azioneTocco({ abbattuti: 2, totale: 6 }, 5)).toBe('aggiungi');
  });
  it('un quadratino pieno toglie un capo, qualunque sia', () => {
    expect(azioneTocco({ abbattuti: 3, totale: 6 }, 2)).toBe('togli');
    expect(azioneTocco({ abbattuti: 3, totale: 6 }, 0)).toBe('togli');
  });
  it('a piano completo un tocco oltre non fa niente', () => {
    expect(azioneTocco({ abbattuti: 4, totale: 4 }, 4)).toBeNull();
  });
});

describe('zona e stagione', () => {
  const camoscio = { subZone: [{ id: 'campa', nome: 'Zona Campa - Spora' }, { id: 'tovel', nome: 'Zona Tovel - Mondifrà' }] };
  it('il camoscio prende la zona dal prefisso della classe', () => {
    expect(zonaDi(camoscio, 'cam1_m1')).toBe('Zona Campa - Spora');
    expect(zonaDi(camoscio, 'cam2_f1')).toBe('Zona Tovel - Mondifrà');
  });
  it('le specie senza subzone non hanno zona', () => {
    expect(zonaDi({}, 'cap_m1')).toBeNull();
  });
  it('la stagione è l’anno del piano', () => {
    expect(stagioneDi({ anno: '2027' })).toBe('2027');
    expect(stagioneDi({})).toBe('2026');
  });
});

describe('voceDaDocumento', () => {
  it('legge una voce con la data del server', () => {
    const quando = new Date(2026, 9, 9, 7, 30);
    const v = voceDaDocumento('a', {
      specieId: 'cervo', catId: 'cer_f', categoria: 'FEMMINE', zona: null,
      cacciatore: 'Bianchi Luca', note: 'sotto la malga', stagione: '2026',
      quando: { toDate: () => quando },
    });
    expect(v).toMatchObject({ id: 'a', cacciatore: 'Bianchi Luca', note: 'sotto la malga', quando });
  });
  it('scarta una voce senza cacciatore invece di far saltare la schermata', () => {
    expect(voceDaDocumento('a', { specieId: 'cervo', catId: 'x', categoria: 'X', stagione: '2026' })).toBeNull();
    expect(voceDaDocumento('a', null)).toBeNull();
  });
});

describe('ultimaVoceDi', () => {
  const voci = [
    voce({ id: 'vecchia', quando: new Date(2026, 8, 1) }),
    voce({ id: 'recente', quando: new Date(2026, 9, 1) }),
    voce({ id: 'altra-classe', catId: 'cap_f', quando: new Date(2026, 9, 5) }),
    voce({ id: 'stagione-prima', stagione: '2025', quando: new Date(2026, 9, 6) }),
  ];
  it('trova la più recente della classe nella stagione', () => {
    expect(ultimaVoceDi(voci, 'capriolo', 'cap_m1', '2026')?.id).toBe('recente');
  });
  it('senza voci per quella classe non trova niente', () => {
    expect(ultimaVoceDi(voci, 'cervo', 'cap_m1', '2026')).toBeNull();
  });
  it('una voce appena scritta, senza ora del server, è la più recente', () => {
    expect(ultimaVoceDi([...voci, voce({ id: 'pendente', quando: null })], 'capriolo', 'cap_m1', '2026')?.id).toBe('pendente');
  });
});

describe('report', () => {
  const oggi = new Date(2026, 9, 9, 20, 0);
  const voci = [
    voce({ id: 'ieri', quando: new Date(2026, 9, 8, 18, 0) }),
    voce({ id: 'mattina', quando: new Date(2026, 9, 9, 6, 45), cacciatore: 'Verdi Gino' }),
    voce({ id: 'sera', quando: new Date(2026, 9, 9, 18, 10), note: 'capo ferito, ritrovato' }),
  ];
  it('oggi contiene solo i capi del giorno', () => {
    expect(vociDelGiorno(voci, oggi).map(v => v.id)).toEqual(['sera', 'mattina']);
  });
  it('l’archivio è diviso per giorno, dal più recente', () => {
    expect(vociPerGiorno(voci).map(g => [g.giorno, g.voci.length])).toEqual([['09/10/2026', 2], ['08/10/2026', 1]]);
  });
  it('la riga contiene data, ora, cacciatore, specie, classe e note', () => {
    expect(rigaReport(voci[2])).toBe('09/10/2026 18:10 — Rossi Mario — Capriolo, MASCHI DI PRIMA CLASSE — capo ferito, ritrovato');
  });
  it('nel camoscio la riga nomina la zona', () => {
    expect(rigaReport(voce({ specieId: 'camoscio', categoria: 'FEMMINE', zona: 'Zona Campa - Spora' })))
      .toContain('Camoscio, FEMMINE (Zona Campa - Spora)');
  });
  it('il testo da copiare va dal più vecchio, come si ricopia', () => {
    expect(testoReport(vociDelGiorno(voci, oggi)).split('\n')[0]).toContain('Verdi Gino');
  });
});

describe('capiSenzaRegistro', () => {
  const data = {
    capriolo: { anno: '2026', categorie: [{ abbattuti: 3 }, { abbattuti: 1 }] },
    cervo: { anno: '2026', categorie: [{ abbattuti: 0 }] },
  } as never;
  it('conta i capi del piano che il registro non conosce', () => {
    expect(capiSenzaRegistro(data, [voce({}), voce({ id: 'b' })])).toBe(2);
  });
  it('le voci di un’altra stagione non contano', () => {
    expect(capiSenzaRegistro(data, [voce({ stagione: '2025' })])).toBe(4);
  });
  it('non va mai sotto zero', () => {
    const tante = Array.from({ length: 9 }, (_, i) => voce({ id: String(i) }));
    expect(capiSenzaRegistro(data, tante)).toBe(0);
  });
});
