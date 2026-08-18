import { describe, expect, it } from 'vitest';
import rawData from '../../data.json';
import {
  categoriaLabel,
  categoriaLeggibile,
  corpoNotifica,
  specieLabel,
  statoLabel,
  titoloNotifica,
  zonaLabel,
} from './labels';

// I dati reali della riserva: il bug si vede solo su questi, perché il camoscio
// ha 12 categorie duplicate su due subzone con lo stesso nome.
const data = rawData as Record<string, any>;

describe('specieLabel', () => {
  it('usa il nome della specie da config', () => {
    expect(specieLabel('cervo', data.cervo)).toBe('Cervo');
    expect(specieLabel('capriolo', data.capriolo)).toBe('Capriolo');
    expect(specieLabel('camoscio', data.camoscio)).toBe('Camoscio');
  });

  it('ricade sul nome noto se il campo manca o è vuoto', () => {
    expect(specieLabel('cervo', {})).toBe('Cervo');
    expect(specieLabel('cervo', { nome: '   ' })).toBe('Cervo');
  });
});

describe('zonaLabel', () => {
  it('non aggiunge zone a cervo e capriolo', () => {
    expect(zonaLabel('cervo', data.cervo, 'ce1')).toBeNull();
    expect(zonaLabel('capriolo', data.capriolo, 'ca1')).toBeNull();
  });

  it('mappa i prefissi cam1_ / cam2_ sulle due subzone', () => {
    expect(zonaLabel('camoscio', data.camoscio, 'cam1_m1')).toBe(data.camoscio.subZone[0].nome);
    expect(zonaLabel('camoscio', data.camoscio, 'cam2_m1')).toBe(data.camoscio.subZone[1].nome);
  });

  it('ricade su Zona 1 / Zona 2 quando subZone manca', () => {
    expect(zonaLabel('camoscio', { nome: 'Camoscio' }, 'cam1_f2')).toBe('Zona 1');
    expect(zonaLabel('camoscio', { nome: 'Camoscio' }, 'cam2_f2')).toBe('Zona 2');
    expect(zonaLabel('camoscio', { nome: 'Camoscio' }, 'altro')).toBeNull();
  });
});

describe('categoriaLabel', () => {
  it('lascia il nome nudo dove non serve la zona', () => {
    const cat = data.cervo.categorie.find((c: { id: string }) => c.id === 'ce1');
    expect(categoriaLabel('cervo', data.cervo, cat)).toBe('MASCHI PALCUTI');
  });

  it('distingue le due subzone del camoscio a parità di nome', () => {
    const z1 = data.camoscio.categorie.find((c: { id: string }) => c.id === 'cam1_m1');
    const z2 = data.camoscio.categorie.find((c: { id: string }) => c.id === 'cam2_m1');
    expect(z1.nome).toBe(z2.nome); // la premessa del bug
    expect(categoriaLabel('camoscio', data.camoscio, z1))
      .not.toBe(categoriaLabel('camoscio', data.camoscio, z2));
  });
});

describe('regressione: nessuna notifica ambigua', () => {
  it('specie + categoria identifica univocamente tutte le categorie reali', () => {
    const etichette = ['cervo', 'capriolo', 'camoscio'].flatMap(id =>
      data[id].categorie.map(
        (cat: { id: string; nome: string }) =>
          `${specieLabel(id, data[id])} — ${categoriaLabel(id, data[id], cat)}`
      )
    );
    expect(new Set(etichette).size).toBe(etichette.length);
  });

  it('senza la specie le etichette collidono (il bug che stiamo correggendo)', () => {
    const soloNomi = ['cervo', 'capriolo', 'camoscio'].flatMap(id =>
      data[id].categorie.map((cat: { nome: string }) => cat.nome)
    );
    expect(new Set(soloNomi).size).toBeLessThan(soloNomi.length);
  });
});

describe('titoloNotifica', () => {
  it('per cervo e capriolo è la sola specie', () => {
    expect(titoloNotifica('cervo', data.cervo, { id: 'ce1' })).toBe('CERVO');
    expect(titoloNotifica('capriolo', data.capriolo, { id: 'ca1' })).toBe('CAPRIOLO');
  });

  it('per il camoscio porta la zona in evidenza', () => {
    expect(titoloNotifica('camoscio', data.camoscio, { id: 'cam1_f3' }))
      .toBe(`CAMOSCIO — ${data.camoscio.subZone[0].nome}`);
    expect(titoloNotifica('camoscio', data.camoscio, { id: 'cam2_f3' }))
      .toBe(`CAMOSCIO — ${data.camoscio.subZone[1].nome}`);
  });

  it('distingue le due zone già dal titolo', () => {
    expect(titoloNotifica('camoscio', data.camoscio, { id: 'cam1_m1' }))
      .not.toBe(titoloNotifica('camoscio', data.camoscio, { id: 'cam2_m1' }));
  });
});

describe('statoLabel', () => {
  it('segue badgeChiusura, il campo scritto dall’admin', () => {
    expect(statoLabel({ nome: 'X', badgeChiusura: 'CHIUSE' }, 'chiuso')).toBe('CHIUSE');
    expect(statoLabel({ nome: 'X', badgeChiusura: 'CHIUSE' }, 'sospeso')).toBe('SOSPESE');
    expect(statoLabel({ nome: 'X', badgeChiusura: 'CHIUSI' }, 'chiuso')).toBe('CHIUSI');
    expect(statoLabel({ nome: 'X', badgeChiusura: 'CHIUSI' }, 'sospeso')).toBe('SOSPESI');
  });

  it('badgeChiusura vince sul nome', () => {
    // categoria dal nome maschile ma badge femminile: comanda il badge
    expect(statoLabel({ nome: 'MASCHI PALCUTI', badgeChiusura: 'CHIUSE' }, 'chiuso')).toBe('CHIUSE');
  });

  it('senza badge ricade sul nome', () => {
    expect(statoLabel({ nome: 'FEMMINE ADULTE' }, 'chiuso')).toBe('CHIUSE');
    expect(statoLabel({ nome: 'MASCHI PALCUTI' }, 'chiuso')).toBe('CHIUSI');
    expect(statoLabel({ nome: 'PICCOLI' }, 'sospeso')).toBe('SOSPESI');
  });

  it('su ogni categoria reale coincide col badge mostrato in CategoryRow', () => {
    for (const id of ['cervo', 'capriolo', 'camoscio']) {
      for (const cat of data[id].categorie) {
        expect(statoLabel(cat, 'chiuso')).toBe(cat.badgeChiusura);
      }
    }
  });
});

describe('corpo della notifica', () => {
  it('categoria in caso normale, stato in maiuscolo', () => {
    expect(corpoNotifica({ nome: 'MASCHI PALCUTI', badgeChiusura: 'CHIUSI' }, 'chiuso'))
      .toBe('Maschi palcuti CHIUSI');
    expect(corpoNotifica({ nome: 'FEMMINE DI TERZA CLASSE', badgeChiusura: 'CHIUSE' }, 'chiuso'))
      .toBe('Femmine di terza classe CHIUSE');
    expect(corpoNotifica({ nome: 'MASCHI DI PRIMA CLASSE', badgeChiusura: 'CHIUSI' }, 'sospeso'))
      .toBe('Maschi di prima classe SOSPESI');
  });

  it('normalizza anche le parentesi dei nomi lunghi', () => {
    expect(categoriaLeggibile('MASCHI DI UN ANNO (FUSONI)')).toBe('Maschi di un anno (fusoni)');
  });

  it('lo stato resta l’unica parte in maiuscolo del corpo', () => {
    for (const id of ['cervo', 'capriolo', 'camoscio']) {
      for (const cat of data[id].categorie) {
        const corpo = corpoNotifica(cat, 'chiuso');
        const inCaps = corpo.split(' ').filter(w => w.length > 2 && w === w.toUpperCase());
        expect(inCaps).toEqual([statoLabel(cat, 'chiuso')]);
      }
    }
  });
});
