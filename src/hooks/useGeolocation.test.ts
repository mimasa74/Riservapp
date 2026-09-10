import { describe, it, expect } from 'vitest'
import { haversineDistance, isInsidePolygon, valutaFix } from './useGeolocation'

// Poligono test: quadrato ~2km attorno a Tuenno (lat 46.41, lng 11.07)
const TEST_POLYGON: number[][] = [
  [11.06, 46.40],
  [11.08, 46.40],
  [11.08, 46.42],
  [11.06, 46.42],
  [11.06, 46.40], // chiuso
]

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(46.41, 11.07, 46.41, 11.07)).toBe(0)
  })

  it('returns approximately 111km per degree of latitude', () => {
    const dist = haversineDistance(0, 0, 1, 0)
    expect(dist).toBeGreaterThan(110000)
    expect(dist).toBeLessThan(112000)
  })

  it('detects movement of ~100m correctly', () => {
    // ~0.001 gradi lat ≈ 111m
    const dist = haversineDistance(46.41, 11.07, 46.411, 11.07)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(150)
  })
})

describe('isInsidePolygon', () => {
  it('returns true for a point inside the polygon', () => {
    expect(isInsidePolygon(46.41, 11.07, TEST_POLYGON)).toBe(true)
  })

  it('returns false for a point outside the polygon', () => {
    expect(isInsidePolygon(46.50, 11.20, TEST_POLYGON)).toBe(false)
  })

  it('returns false for empty polygon', () => {
    expect(isInsidePolygon(46.41, 11.07, [])).toBe(false)
  })
})

describe('valutaFix — cosa fare di una posizione appena arrivata', () => {
  const base = {
    poligonoPronto: true,
    dentro: true,
    eraDentro: true,
    ultimaPosizione: { lat: 46.41, lng: 11.07 },
    lat: 46.41,
    lng: 11.07,
    adesso: 1_000_000_000,
    ultimoInvio: 1_000_000_000,
  }

  it('aspetta il poligono invece di dare il socio per fuori riserva', () => {
    // Il bug del 10 set 2026: senza confine il fix veniva scartato in silenzio
    expect(valutaFix({ ...base, poligonoPronto: false, dentro: false })).toBe('aspetta-poligono')
  })

  it('fuori dal poligono non scrive niente', () => {
    expect(valutaFix({ ...base, dentro: false })).toBe('fuori')
  })

  it('appena entrato scrive subito, senza aspettare il quarto d ora', () => {
    expect(valutaFix({ ...base, eraDentro: false, ultimoInvio: base.adesso })).toBe('scrivi')
  })

  it('fermo: aspetta mezz ora', () => {
    const dopo20min = { ...base, adesso: base.ultimoInvio + 20 * 60_000 }
    expect(valutaFix(dopo20min)).toBe('troppo-presto')
    expect(valutaFix({ ...base, adesso: base.ultimoInvio + 31 * 60_000 })).toBe('scrivi')
  })

  it('spostato di piu di 100 metri: basta un quarto d ora', () => {
    // ~150 m piu' a nord
    const mosso = { ...base, lat: 46.4114, adesso: base.ultimoInvio + 16 * 60_000 }
    expect(valutaFix(mosso)).toBe('scrivi')
    expect(valutaFix({ ...mosso, adesso: base.ultimoInvio + 10 * 60_000 })).toBe('troppo-presto')
  })

  it('primo punto di sempre dentro la riserva: scrive', () => {
    expect(valutaFix({ ...base, eraDentro: false, ultimaPosizione: null, ultimoInvio: 0 })).toBe('scrivi')
  })
})
