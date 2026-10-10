import { describe, it, expect } from 'vitest';
import { confermaEliminaPost, confermaUltimoCapo, confermaTogliCapo } from './conferme';

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

describe('confermaEliminaPost', () => {
  it('mette le prime parole del messaggio dentro la domanda', () => {
    expect(confermaEliminaPost({ testo: 'Domenica battuta rinviata' })).toBe(
      'Cancellare il messaggio “Domenica battuta rinviata”? Non si potrà recuperare.',
    );
  });

  // Su un telefono la domanda deve stare in poche righe: un messaggio lungo va
  // troncato, altrimenti la conferma diventa un muro di testo che non si legge.
  // Il taglio cade sull'ultima parola intera, non a metà parola.
  it("accorcia i messaggi lunghi sull'ultima parola intera", () => {
    const lungo = 'Domenica la battuta è rinviata a sabato prossimo per via del maltempo previsto';
    expect(confermaEliminaPost({ testo: lungo })).toBe(
      'Cancellare il messaggio “Domenica la battuta è rinviata a sabato prossimo…”? Non si potrà recuperare.',
    );
  });

  it('una parola sola più lunga del taglio non sparisce', () => {
    expect(confermaEliminaPost({ testo: 'A'.repeat(60) })).toBe(
      `Cancellare il messaggio “${'A'.repeat(50)}…”? Non si potrà recuperare.`,
    );
  });

  it('appiattisce gli a capo, che nella domanda spezzerebbero la frase', () => {
    expect(confermaEliminaPost({ testo: '  Battuta\n\nrinviata  ' })).toBe(
      'Cancellare il messaggio “Battuta rinviata”? Non si potrà recuperare.',
    );
  });

  // "questo messaggio" farebbe pensare a un testo che non c'è.
  it('un post di sola foto viene chiamato foto', () => {
    expect(confermaEliminaPost({ testo: '', foto_url: 'https://x/y.jpg' })).toBe(
      'Cancellare questa foto? Non si potrà recuperare.',
    );
  });

  it('senza testo né foto resta generica invece di saltare', () => {
    expect(confermaEliminaPost({})).toBe('Cancellare questo messaggio? Non si potrà recuperare.');
  });
});

describe('confermaTogliCapo', () => {
  it('nomina il cacciatore e il giorno del capo che si toglie', () => {
    const voce = {
      id: 'v', specieId: 'capriolo', catId: 'cap_f', categoria: 'FEMMINE', zona: null,
      cacciatore: 'Rossi Mario', note: '', quando: new Date(2026, 9, 9, 7, 0), stagione: '2026',
    };
    expect(confermaTogliCapo({ nome: 'FEMMINE' }, voce)).toBe(
      'Togliere il capo di Rossi Mario del 09/10/2026 da FEMMINE? La riga del registro verrà cancellata.',
    );
  });

  it('un capo segnato prima del registro lo dice', () => {
    expect(confermaTogliCapo({ nome: 'FEMMINE' }, null)).toBe(
      'Togliere un capo da FEMMINE? Era stato segnato prima del registro.',
    );
  });
});
