import { useEffect, useRef, useState } from 'react';
import { AppData } from '../types';
import {
  NovitaSpecie,
  incrementiPerCategoria,
  contaCapiNuovi,
  leggiSnapshot,
  salvaSnapshot,
  snapshotDaSpecie,
} from '../utils/novita';

export type { NovitaSpecie };

export const NESSUNA: NovitaSpecie = { capi: 0, categorie: {} };

/**
 * Avvisa il socio che il Rettore ha segnato degli abbattimenti.
 * Confronto locale con la fotografia su localStorage: niente Firestore,
 * niente regole nuove, niente push.
 *
 * La fotografia si aggiorna quando il socio ESCE dalla specie, non quando
 * entra: altrimenti la pastiglia NUOVO sparirebbe prima che possa vederla.
 */
export function useNovita(data: AppData, currentScreen: string): Record<string, NovitaSpecie> {
  const [novita, setNovita] = useState<Record<string, NovitaSpecie>>({});

  const dataRef = useRef(data);
  dataRef.current = data;

  const schermataRef = useRef(currentScreen);
  schermataRef.current = currentScreen;

  // Il confronto è sui numeri, non sull'identità dell'oggetto: `data` arriva da
  // uno snapshot Firestore e cambia identità a ogni consegna, anche quando i capi
  // sono gli stessi. Ricalcolare a ogni render ma uscire subito se nulla è mosso.
  const ultimaFotografia = useRef<string | null>(null);

  useEffect(() => {
    const correnti: Record<string, ReturnType<typeof snapshotDaSpecie>> = {};
    for (const [specieId, specie] of Object.entries(data)) {
      if (!specie?.categorie) continue;
      correnti[specieId] = snapshotDaSpecie(specie);
    }

    const chiave = JSON.stringify(correnti);
    if (chiave === ultimaFotografia.current) return;
    ultimaFotografia.current = chiave;

    const calcolate: Record<string, NovitaSpecie> = {};
    for (const [specieId, curr] of Object.entries(correnti)) {
      const prec = leggiSnapshot(specieId);
      if (!prec) {
        // primo avvio su questo telefono: nessun termine di paragone,
        // si registra lo stato attuale senza avvisare di nulla
        salvaSnapshot(specieId, curr);
        calcolate[specieId] = NESSUNA;
        continue;
      }
      const capi = contaCapiNuovi(prec, curr);
      calcolate[specieId] = capi > 0
        ? { capi, categorie: incrementiPerCategoria(prec, curr) }
        : NESSUNA;
    }
    setNovita(prec => {
      // La specie aperta in questo momento resta com'era all'ingresso: i capi che
      // il Rettore segna mentre il socio la sta guardando li vede in diretta, e la
      // pastiglia NUOVO non deve accendersi sotto il dito di chi li sta segnando.
      const vista = schermataRef.current;
      if (vista in calcolate) calcolate[vista] = prec[vista] ?? NESSUNA;
      return calcolate;
    });
  });

  // uscita dalla specie → fotografia aggiornata e avviso spento
  useEffect(() => {
    const specieId = currentScreen;
    if (!dataRef.current[specieId]) return;
    return () => {
      const specie = dataRef.current[specieId];
      if (!specie?.categorie) return;
      salvaSnapshot(specieId, snapshotDaSpecie(specie));
      setNovita(prec => ({ ...prec, [specieId]: NESSUNA }));
    };
  }, [currentScreen]);

  return novita;
}
