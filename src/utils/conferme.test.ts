import { describe, it, expect } from 'vitest';
import { confermaUltimoCapo } from './conferme';

const cat = (over: Partial<Parameters<typeof confermaUltimoCapo>[0]> = {}) => ({
  nome: 'FEMMINE',
  totale: 6,
  stato: 'aperto' as const,
  ...over,
});

describe('confermaUltimoCapo', () => {
  it('in una classe aperta parla di quota completata', () => {
    expect(confermaUltimoCapo(cat())).toBe('Quota completata per FEMMINE (6/6). Confermi?');
  });

  it('in una classe chiusa parla anch\'essa di quota completata', () => {
    expect(confermaUltimoCapo(cat({ stato: 'chiuso' }))).toBe(
      'Quota completata per FEMMINE (6/6). Confermi?',
    );
  });

  // In una classe sospesa non hai completato nessuna quota: hai registrato l'ultimo
  // capo che quella classe può contenere, e che non doveva cadere.
  it('in una classe sospesa non parla di quota', () => {
    expect(confermaUltimoCapo(cat({ nome: 'MASCHI DI SECONDA CLASSE', totale: 2, stato: 'sospeso' }))).toBe(
      'Segni il 2° capo su 2 in MASCHI DI SECONDA CLASSE, classe sospesa. Confermi?',
    );
  });
});
