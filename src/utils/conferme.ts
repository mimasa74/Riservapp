import { CategoriaStato } from '../types';

/**
 * Domanda che ferma la mano quando il tocco croccia l'ultimo quadratino.
 * I quadratini sono 26px: un tocco storto completerebbe il piano di prelievo per
 * sbaglio, e per accorgersene bisognerebbe ricontare i capi.
 *
 * In una classe sospesa "quota completata" sarebbe falso: nessuna quota è stata
 * completata, è caduto l'ultimo capo che quella classe può contenere — e non
 * doveva cadere nessuno.
 */
export function confermaUltimoCapo(cat: {
  nome: string;
  totale: number;
  stato: CategoriaStato;
}): string {
  if (cat.stato === 'sospeso') {
    return `Segni il ${cat.totale}° capo su ${cat.totale} in ${cat.nome}, classe sospesa. Confermi?`;
  }
  return `Quota completata per ${cat.nome} (${cat.totale}/${cat.totale}). Confermi?`;
}

/**
 * Domanda che ferma la mano sul cestino di un messaggio in bacheca.
 *
 * Il cestino sta a 10px dalla data, in cima a ogni card, e ha un'area toccabile
 * di 24px: scorrendo la bacheca si prende per sbaglio. Fino al 2 set 2026
 * cancellava all'istante senza chiedere niente, ed è così che è sparito un
 * annuncio urgente. Un post cancellato non si recupera: Firestore non ne tiene
 * copia e in app non c'è cestino.
 *
 * Le prime parole del messaggio stanno dentro la domanda apposta: senza, la
 * conferma direbbe solo "questo messaggio" e chi ha toccato per sbaglio non
 * saprebbe quale sta perdendo.
 */
export function confermaEliminaPost(post: { testo?: string; foto_url?: string | null }): string {
  const testo = (post.testo ?? '').replace(/\s+/g, ' ').trim();
  if (testo) {
    // Il taglio cade sull'ultima parola intera: mozzata a metà ("prossimo p…")
    // la frase sembra rotta, e il Rettore si chiede se sia rotto il messaggio.
    const breve = testo.length > 50
      ? `${testo.slice(0, 50).replace(/\s+\S*$/, '').trimEnd()}…`
      : testo;
    return `Cancellare il messaggio “${breve}”? Non si potrà recuperare.`;
  }
  // Un post di sola foto non ha parole da mostrare, ma va comunque nominato per
  // quello che è: "questo messaggio" farebbe pensare a un testo.
  if (post.foto_url) return 'Cancellare questa foto? Non si potrà recuperare.';
  return 'Cancellare questo messaggio? Non si potrà recuperare.';
}
