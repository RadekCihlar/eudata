import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { insolvency } from '../src/insolvency.js'
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

function mockText(body: string, status = 200): void {
  globalThis.fetch = vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch
}

describe('insolvency.check', () => {
  it('returns empty result for empty-string body', async () => {
    mockText('')
    const r = await insolvency.check('64774716', { retries: 0 })
    expect(r.count).toBe(0)
    expect(r.proceedings).toEqual([])
    expect(r.insolvent).toBe(false)
  })

  it('maps active proceedings', async () => {
    mockText(
      JSON.stringify({
        pocetVysledku: 1,
        vysledky: [
          {
            idOsoby: 'P-001',
            druhRizeni: 'INSO',
            stavRizeni: 'PROBIHAJICI',
            datumZahajeni: '2024-06-01',
            spisovaZnacka: 'MSPH 99 INS 1/2024',
          },
        ],
      })
    )
    const r = await insolvency.check('64774716', { retries: 0 })
    expect(r.count).toBe(1)
    expect(r.insolvent).toBe(true)
    expect(r.proceedings[0]!.status).toBe('active')
    expect(r.proceedings[0]!.fileReference).toBe('MSPH 99 INS 1/2024')
  })

  it('maps resolved proceedings', async () => {
    mockText(
      JSON.stringify({
        pocetVysledku: 1,
        vysledky: [{ stavRizeni: 'PRAVOMOCNE_SKONCENO' }],
      })
    )
    const r = await insolvency.check('64774716', { retries: 0 })
    expect(r.proceedings[0]!.status).toBe('resolved')
    expect(r.insolvent).toBe(false)
  })

  it('handles HTML body (gov outage) as no results', async () => {
    mockText('<html><body>maintenance</body></html>')
    const r = await insolvency.check('64774716', { retries: 0 })
    expect(r.count).toBe(0)
  })

  it('validates ICO before querying', async () => {
    await expect(insolvency.check('64774717', { retries: 0 })).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('insolvency.checkPerson', () => {
  it('passes name and birthDate as query params', async () => {
    const fn = vi.fn(async () => new Response('', { status: 200 }))
    globalThis.fetch = fn as unknown as typeof fetch
    await insolvency.checkPerson('Jan Novák', '1980-01-15', { retries: 0 })
    const url = new URL(fn.mock.calls[0]![0] as string)
    expect(url.searchParams.get('jmeno')).toBe('Jan Novák')
    expect(url.searchParams.get('datumNarozeni')).toBe('1980-01-15')
  })
})

describe('insolvency.detail', () => {
  it('returns proceeding with events array', async () => {
    mockText(
      JSON.stringify({
        pocetVysledku: 1,
        vysledky: [{ spisovaZnacka: 'X', stavRizeni: 'PROBIHAJICI', datumZahajeni: '2024-01-01' }],
      })
    )
    const d = await insolvency.detail('X', { retries: 0 })
    expect(d.fileReference).toBe('X')
    expect(d.status).toBe('active')
    expect(d.events).toEqual([])
  })

  it('returns empty proceeding when not found', async () => {
    mockText('')
    const d = await insolvency.detail('UNKNOWN', { retries: 0 })
    expect(d.fileReference).toBe('UNKNOWN')
    expect(d.status).toBe('unknown')
  })
})
