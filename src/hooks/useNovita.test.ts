import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNovita } from './useNovita';
import { leggiSnapshot } from '../utils/novita';
import { AppData, SpecieData } from '../types';

const specie = (id: string, categorie: Record<string, number>): SpecieData => ({
  id,
  nome: id,
  nomeInglese: id,
  logoUrl: '',
  categorie: Object.entries(categorie).map(([catId, abbattuti]) => ({
    id: catId,
    nome: catId.toUpperCase(),
    badgeChiusura: 'CHIUSI',
    totale: 10,
    abbattuti,
    stato: 'aperto' as const,
  })),
  note: '',
  alert: '',
  ruota: {},
});

const dati = (cervo: Record<string, number>, camoscio: Record<string, number> = {}): AppData => ({
  cervo: specie('cervo', cervo),
  camoscio: specie('camoscio', camoscio),
});

describe('useNovita', () => {
  beforeEach(() => localStorage.clear());

  it('al primo avvio non segnala nulla e salva la fotografia in silenzio', () => {
    const { result } = renderHook(() => useNovita(dati({ cer_femmine: 4 }), 'bacheca'));

    expect(result.current.cervo.capi).toBe(0);
    expect(leggiSnapshot('cervo')).toEqual({ cer_femmine: 4 });
  });

  it('segnala i capi nuovi arrivati mentre il socio e_ in bacheca', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useNovita(data, 'bacheca'),
      { initialProps: { data: dati({ cer_femmine: 1, cer_fusoni: 0 }) } },
    );

    rerender({ data: dati({ cer_femmine: 3, cer_fusoni: 0 }) });

    expect(result.current.cervo.capi).toBe(2);
    expect(result.current.cervo.categorie).toEqual({ cer_femmine: 2 });
  });

  it('non sporca le altre specie', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useNovita(data, 'bacheca'),
      { initialProps: { data: dati({ cer_femmine: 1 }, { cam1_maschi: 2 }) } },
    );

    rerender({ data: dati({ cer_femmine: 3 }, { cam1_maschi: 2 }) });

    expect(result.current.camoscio.capi).toBe(0);
  });

  it('mostra ancora le novita_ mentre il socio guarda quella specie', () => {
    const { result, rerender } = renderHook(
      ({ data, screen }) => useNovita(data, screen),
      { initialProps: { data: dati({ cer_femmine: 1 }), screen: 'bacheca' } },
    );

    rerender({ data: dati({ cer_femmine: 3 }), screen: 'bacheca' });
    rerender({ data: dati({ cer_femmine: 3 }), screen: 'cervo' });

    expect(result.current.cervo.categorie).toEqual({ cer_femmine: 2 });
  });

  it('spegne l_avviso quando il socio esce dalla specie appena guardata', () => {
    const { result, rerender } = renderHook(
      ({ data, screen }) => useNovita(data, screen),
      { initialProps: { data: dati({ cer_femmine: 1 }), screen: 'bacheca' } },
    );

    rerender({ data: dati({ cer_femmine: 3 }), screen: 'cervo' });
    rerender({ data: dati({ cer_femmine: 3 }), screen: 'bacheca' });

    expect(result.current.cervo.capi).toBe(0);
    expect(leggiSnapshot('cervo')).toEqual({ cer_femmine: 3 });
  });

  it('non accende nulla per i capi segnati mentre il socio guarda quella specie', () => {
    const { result, rerender } = renderHook(
      ({ data, screen }) => useNovita(data, screen),
      { initialProps: { data: dati({ cer_femmine: 1 }), screen: 'cervo' } },
    );

    rerender({ data: dati({ cer_femmine: 3 }), screen: 'cervo' });

    expect(result.current.cervo.capi).toBe(0);
  });

  it('tiene l_avviso acceso finche_ il socio non entra nella specie', () => {
    const primo = renderHook(() => useNovita(dati({ cer_femmine: 1 }), 'bacheca'));
    primo.unmount();

    const { result } = renderHook(() => useNovita(dati({ cer_femmine: 3 }), 'bacheca'));

    expect(result.current.cervo.capi).toBe(2);
  });
});
