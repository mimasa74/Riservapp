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
