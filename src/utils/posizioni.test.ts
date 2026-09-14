import { describe, it, expect } from 'vitest'
import { dimensioneNome, formatOra, raggruppaPerSocio, PuntoPosizione } from './posizioni'

const p = (deviceId: string, nome: string, lat: number, ms: number | null): PuntoPosizione =>
  ({ deviceId, nome, lat, lng: 11.07, ms })

describe('raggruppaPerSocio', () => {
  it('di ogni telefono tiene solo il punto piu recente', () => {
    const posizioni = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.43, 3_000),
      p('d1', 'Rossi Mario', 46.41, 1_000),
      p('d1', 'Rossi Mario', 46.42, 2_000),
    ])
    expect(posizioni).toHaveLength(1)
    expect(posizioni[0].ultimo.lat).toBe(46.43)
  })

  it('tiene separati due soci', () => {
    const posizioni = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.41, 1_000),
      p('d2', 'Bianchi Luca', 46.42, 2_000),
    ])
    expect(posizioni.map(s => s.nome)).toEqual(['Bianchi Luca', 'Rossi Mario'])
  })

  it('il punto senza ora del server e il piu recente', () => {
    // Un punto appena scritto dal telefono: il server non gli ha ancora messo l'ora
    const posizioni = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.41, null),
      p('d1', 'Rossi Mario', 46.42, 1_000),
    ])
    expect(posizioni[0].ultimo.lat).toBe(46.41)
    expect(posizioni[0].ora).toBe('')
  })

  it('scarta i documenti rotti invece di far saltare la mappa', () => {
    const rotto = { deviceId: 'd9', nome: 'X', lat: NaN, lng: 11, ms: 1 } as unknown as PuntoPosizione
    const posizioni = raggruppaPerSocio([
      rotto,
      { ...rotto, lat: 'boh' as unknown as number },
      p('d1', 'Rossi Mario', 46.41, 1_000),
    ])
    expect(posizioni).toHaveLength(1)
    expect(posizioni[0].deviceId).toBe('d1')
  })

  it('un punto rotto non cancella il punto buono dello stesso telefono', () => {
    const posizioni = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.41, 1_000),
      { deviceId: 'd1', nome: 'Rossi Mario', lat: NaN, lng: 11.07, ms: 9_000 },
    ])
    expect(posizioni).toHaveLength(1)
    expect(posizioni[0].ultimo.lat).toBe(46.41)
  })
})

describe('dimensioneNome', () => {
  it('cresce con lo zoom', () => {
    expect(dimensioneNome(17)).toBeGreaterThan(dimensioneNome(13))
  })

  it('resta leggibile da lontano e non invade lo schermo da vicino', () => {
    expect(dimensioneNome(3)).toBe(15)
    expect(dimensioneNome(21)).toBe(40)
  })

  it('senza zoom usa la misura di mezzo invece di sparire', () => {
    expect(dimensioneNome(NaN)).toBe(20)
    expect(dimensioneNome(undefined as unknown as number)).toBe(20)
  })
})

describe('formatOra', () => {
  it('scrive ore e minuti con lo zero davanti ai minuti', () => {
    const d = new Date(2026, 8, 10, 9, 5)
    expect(formatOra(d.getTime())).toBe('9:05')
  })

  it('senza ora restituisce stringa vuota', () => {
    expect(formatOra(null)).toBe('')
  })
})
