import { describe, it, expect } from 'vitest'
import { formatOra, raggruppaPerSocio, PuntoPosizione } from './scie'

const p = (deviceId: string, nome: string, lat: number, ms: number | null): PuntoPosizione =>
  ({ deviceId, nome, lat, lng: 11.07, ms })

describe('raggruppaPerSocio', () => {
  it('mette insieme i punti dello stesso telefono, in ordine di tempo', () => {
    const scie = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.43, 3_000),
      p('d1', 'Rossi Mario', 46.41, 1_000),
      p('d1', 'Rossi Mario', 46.42, 2_000),
    ])
    expect(scie).toHaveLength(1)
    expect(scie[0].punti.map(x => x.lat)).toEqual([46.41, 46.42, 46.43])
    expect(scie[0].ultimo.lat).toBe(46.43)
  })

  it('tiene separati due soci', () => {
    const scie = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.41, 1_000),
      p('d2', 'Bianchi Luca', 46.42, 2_000),
    ])
    expect(scie.map(s => s.nome)).toEqual(['Bianchi Luca', 'Rossi Mario'])
  })

  it('il punto senza ora del server e il piu recente', () => {
    // Un punto appena scritto dal telefono: il server non gli ha ancora messo l'ora
    const scie = raggruppaPerSocio([
      p('d1', 'Rossi Mario', 46.41, null),
      p('d1', 'Rossi Mario', 46.42, 1_000),
    ])
    expect(scie[0].ultimo.lat).toBe(46.41)
    expect(scie[0].ora).toBe('')
  })

  it('scarta i documenti rotti invece di far saltare la mappa', () => {
    const rotto = { deviceId: 'd9', nome: 'X', lat: NaN, lng: 11, ms: 1 } as unknown as PuntoPosizione
    const scie = raggruppaPerSocio([
      { ...rotto, lat: 'boh' as unknown as number },
      p('d1', 'Rossi Mario', 46.41, 1_000),
    ])
    expect(scie).toHaveLength(1)
    expect(scie[0].deviceId).toBe('d1')
  })

  it('un socio con un punto solo ha una scia di un punto', () => {
    const scie = raggruppaPerSocio([p('d1', 'Rossi Mario', 46.41, 1_000)])
    expect(scie[0].punti).toHaveLength(1)
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
