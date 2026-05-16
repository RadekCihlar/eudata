import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { company } from '../src/company.js'
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

const ORSF_FIXTURE = {
  ico: '64774716',
  obchodneMeno: 'Test s.r.o.',
  adresa: { ulica: 'Hlavná', cisloDomu: 1, obec: 'Bratislava', psc: '811 01' },
  pravnaForma: 's.r.o.',
  datumVzniku: '2015-01-01',
  datumZaniku: null,
  dic: '2020123456',
  icDph: 'SK2020123456',
  skNace: ['62010'],
  zakladneImanie: 5000,
  mena: 'EUR',
  konatelia: [{ meno: 'Ján Novák', funkcia: 'konateľ', od: '2015-01-01' }],
}

describe('company.lookup', () => {
  it('maps ORSF entity', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(ORSF_FIXTURE), { status: 200 })
    ) as unknown as typeof fetch
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.ico).toBe('64774716')
    expect(info.name).toBe('Test s.r.o.')
    expect(info.icDph).toBe('SK2020123456')
    expect(info.address.city).toBe('Bratislava')
    expect(info.directors).toHaveLength(1)
    expect(info.directors[0]!.name).toBe('Ján Novák')
    expect(info.active).toBe(true)
  })

  it('marks dissolved inactive', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ...ORSF_FIXTURE, datumZaniku: '2022-01-01' }), { status: 200 })
    ) as unknown as typeof fetch
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.active).toBe(false)
    expect(info.dissolved).toBe('2022-01-01')
  })
})

describe('company.search', () => {
  it('returns mapped list', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ results: [ORSF_FIXTURE] }), { status: 200 })
    ) as unknown as typeof fetch
    const list = await company.search('Test', { retries: 0 })
    expect(list).toHaveLength(1)
    expect(list[0]!.ico).toBe('64774716')
  })
})
