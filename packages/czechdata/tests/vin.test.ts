import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { vin } from '../src/vin.js'
import { clearCache, configure, resetConfig, resetRateLimit, ValidationError } from 'eudata-common'

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

describe('vin.validate', () => {
  it('accepts known good VIN', () => {
    expect(vin.validate('1HGCM82633A004352')).toBe(true)
  })

  it('rejects bad checksum', () => {
    expect(vin.validate('1HGCM82633A004353')).toBe(false)
  })

  it('rejects I/O/Q characters', () => {
    expect(vin.validate('1HGCM82633A00435I')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(vin.validate('1HGCM')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(vin.validate('1hgcm82633a004352')).toBe(true)
  })
})

describe('vin.decode', () => {
  it('maps NHTSA response', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          Results: [
            { Variable: 'Make', Value: 'HONDA' },
            { Variable: 'Model', Value: 'Accord' },
            { Variable: 'Model Year', Value: '2003' },
            { Variable: 'Body Class', Value: 'Sedan' },
            { Variable: 'Fuel Type - Primary', Value: 'Gasoline' },
            { Variable: 'Plant Country', Value: 'UNITED STATES (USA)' },
          ],
        }),
        { status: 200 }
      )
    ) as unknown as typeof fetch
    const d = await vin.decode('1HGCM82633A004352', { retries: 0 })
    expect(d.make).toBe('HONDA')
    expect(d.model).toBe('Accord')
    expect(d.year).toBe(2003)
    expect(d.fuelType).toBe('Gasoline')
  })

  it('throws on bad format before fetching', async () => {
    await expect(vin.decode('TOO_SHORT', { retries: 0 })).rejects.toBeInstanceOf(ValidationError)
  })
})
