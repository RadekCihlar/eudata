import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { vehicle } from '../src/vehicle.js'
import { clearCache, configure, resetConfig, resetRateLimit } from 'eudata-common'

const originalFetch = globalThis.fetch

beforeEach(() => {
  clearCache()
  resetConfig()
  resetRateLimit()
  configure({ rateLimitPerMinute: 0 })
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('vehicle.byPlate', () => {
  it('extracts VIN and STK expiry from HTML', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        `<html>VIN: 1HGCM82633A004352  Platnost STK: 2027-06-15  Emise: 2026-06-15</html>`,
        { status: 200 }
      )
    ) as unknown as typeof fetch
    const info = await vehicle.byPlate('1A23456', { retries: 0 })
    expect(info.vin).toBe('1HGCM82633A004352')
    expect(info.stkExpiry).toBe('2027-06-15')
    expect(info.emissionExpiry).toBe('2026-06-15')
  })
})

describe('vehicle.odometerCheck', () => {
  it('detects rollback', async () => {
    const html = `
      <tr class="inspection"><td>2022-01-01</td><td>Vyhovel</td><td>100000 km</td><td>STK Praha</td></tr>
      <tr class="inspection"><td>2023-01-01</td><td>Vyhovel</td><td>80000 km</td><td>STK Praha</td></tr>
    `
    globalThis.fetch = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch
    const report = await vehicle.odometerCheck('1A23456', { retries: 0 })
    expect(report.suspicious).toBe(true)
    expect(report.anomalies.some((a) => a.type === 'rollback')).toBe(true)
  })

  it('returns clean for normal progression', async () => {
    const html = `
      <tr class="inspection"><td>2022-01-01</td><td>Vyhovel</td><td>50000 km</td><td>STK</td></tr>
      <tr class="inspection"><td>2023-01-01</td><td>Vyhovel</td><td>65000 km</td><td>STK</td></tr>
    `
    globalThis.fetch = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch
    const report = await vehicle.odometerCheck('1A23456', { retries: 0 })
    expect(report.suspicious).toBe(false)
  })
})
