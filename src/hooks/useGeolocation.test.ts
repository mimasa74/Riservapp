import { describe, it, expect } from 'vitest'
import { haversineDistance, isInsidePolygon } from './useGeolocation'

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
