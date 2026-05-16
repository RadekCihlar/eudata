import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { risk } from '../src/risk.js'
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

function makeFetch(handler: (url: string) => { body: string; status?: number }): void {
  globalThis.fetch = vi.fn(async (url: unknown) => {
    const { body, status } = handler(url as string)
    return new Response(body, { status: status ?? 200 })
  }) as unknown as typeof fetch
}

function aresFixture(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ico: '64774716',
    obchodniJmeno: 'Acme s.r.o.',
    sidlo: { nazevObce: 'Praha' },
    pravniForma: '121',
    datumVzniku: '2010-01-01',
    datumZaniku: null,
    dic: 'CZ64774716',
    czNace: [],
    seznamRegistraci: { stavZdrojeRos: 'AKTIVNI', stavZdrojeDph: 'AKTIVNI' },
    ...overrides,
  })
}

const ISIR_EMPTY = ''
const ISIR_ACTIVE = JSON.stringify({
  pocetVysledku: 1,
  vysledky: [{ stavRizeni: 'PROBIHAJICI', spisovaZnacka: 'X' }],
})

const SOAP_OK = `<envelope><statusPlatceDPH>SPOLEHLIVY</statusPlatceDPH><nespolehlivyPlatce>NE</nespolehlivyPlatce></envelope>`
const SOAP_UNRELIABLE = `<envelope><statusPlatceDPH>NESPOLEHLIVY</statusPlatceDPH><nespolehlivyPlatce>ANO</nespolehlivyPlatce></envelope>`

describe('risk.assess', () => {
  it('returns low risk for clean, established company', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture() }
      if (url.includes('isir.justice.cz')) return { body: ISIR_EMPTY }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_OK }
      return { body: '', status: 404 }
    })
    const report = await risk.assess('64774716', { retries: 0 })
    expect(report.level).toBe('low')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.insolvency.insolvent).toBe(false)
    expect(report.vat?.unreliable).toBe(false)
  })

  it('returns critical risk when insolvency active', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture() }
      if (url.includes('isir.justice.cz')) return { body: ISIR_ACTIVE }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_OK }
      return { body: '', status: 404 }
    })
    const report = await risk.assess('64774716', { retries: 0 })
    expect(report.level).toBe('critical')
    expect(report.score).toBeLessThanOrEqual(15)
    expect(report.flags.some((f) => f.code === 'INSOLVENCY_ACTIVE')).toBe(true)
  })

  it('flags dissolved companies as critical', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture({ datumZaniku: '2020-01-01' }) }
      if (url.includes('isir.justice.cz')) return { body: ISIR_EMPTY }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_OK }
      return { body: '', status: 404 }
    })
    const report = await risk.assess('64774716', { retries: 0 })
    expect(report.level).toBe('critical')
    expect(report.flags.some((f) => f.code === 'DISSOLVED')).toBe(true)
  })

  it('flags unreliable VAT payer', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture() }
      if (url.includes('isir.justice.cz')) return { body: ISIR_EMPTY }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_UNRELIABLE }
      return { body: '', status: 404 }
    })
    const report = await risk.assess('64774716', { retries: 0 })
    expect(report.flags.some((f) => f.code === 'VAT_UNRELIABLE')).toBe(true)
    expect(report.score).toBeLessThanOrEqual(20)
  })
})

describe('risk.quick', () => {
  it('returns summarized risk', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture() }
      if (url.includes('isir.justice.cz')) return { body: ISIR_EMPTY }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_OK }
      return { body: '', status: 404 }
    })
    const q = await risk.quick('64774716', { retries: 0 })
    expect(q.ico).toBe('64774716')
    expect(typeof q.score).toBe('number')
    expect(typeof q.flagCount).toBe('number')
  })
})

describe('risk.batch', () => {
  it('processes multiple ICOs in parallel', async () => {
    makeFetch((url) => {
      if (url.includes('ares.gov.cz')) return { body: aresFixture() }
      if (url.includes('isir.justice.cz')) return { body: ISIR_EMPTY }
      if (url.includes('adisws.mfcr.cz')) return { body: SOAP_OK }
      return { body: '', status: 404 }
    })
    const reports = await risk.batch(['64774716', '64774716'], { retries: 0 })
    expect(reports).toHaveLength(2)
  })
})
