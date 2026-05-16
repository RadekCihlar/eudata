import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { company } from '../src/company.js'
import { clearCache, resetConfig, configure, resetRateLimit, ValidationError } from 'eudata-common'

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

function mockJson(payload: unknown, status = 200): void {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(payload), { status })) as unknown as typeof fetch
}

const ARES_FIXTURE = {
  ico: '64774716',
  obchodniJmeno: 'Test Company s.r.o.',
  sidlo: {
    nazevUlice: 'Václavské náměstí',
    cisloDomovni: 1,
    cisloOrientacni: 2,
    nazevObce: 'Praha',
    psc: 11000,
    kodAdresnihoMista: 999,
  },
  pravniForma: '121',
  datumVzniku: '2010-01-15',
  datumZaniku: null,
  dic: 'CZ64774716',
  czNace: ['620100'],
  seznamRegistraci: { stavZdrojeRos: 'AKTIVNI', stavZdrojeDph: 'AKTIVNI' },
}

describe('company.lookup', () => {
  it('returns mapped CompanyInfo', async () => {
    mockJson(ARES_FIXTURE)
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.ico).toBe('64774716')
    expect(info.name).toBe('Test Company s.r.o.')
    expect(info.legalForm).toBe('as')
    expect(info.legalFormCode).toBe('121')
    expect(info.active).toBe(true)
    expect(info.vatId).toBe('CZ64774716')
    expect(info.address.city).toBe('Praha')
    expect(info.naceCodes).toEqual(['620100'])
  })

  it('marks dissolved companies inactive', async () => {
    mockJson({ ...ARES_FIXTURE, datumZaniku: '2020-12-31' })
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.active).toBe(false)
    expect(info.dissolved).toBe('2020-12-31')
  })

  it('honors stavZdrojeRos when not dissolved', async () => {
    mockJson({
      ...ARES_FIXTURE,
      datumZaniku: null,
      seznamRegistraci: { stavZdrojeRos: 'NEAKTIVNI' },
    })
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.active).toBe(false)
  })

  it('pads short ICO before lookup', async () => {
    const fn = vi.fn(async () => new Response(JSON.stringify({ ...ARES_FIXTURE, ico: '00000001' }), { status: 200 }))
    globalThis.fetch = fn as unknown as typeof fetch
    await company.lookup('00000001', { retries: 0 })
    const calledUrl = (fn.mock.calls[0]![0] as string)
    expect(calledUrl).toContain('/00000001')
  })

  it('throws ValidationError on bad checksum', async () => {
    await expect(company.lookup('64774717', { retries: 0 })).rejects.toBeInstanceOf(ValidationError)
  })

  it('handles null sidlo', async () => {
    mockJson({ ...ARES_FIXTURE, sidlo: undefined })
    const info = await company.lookup('64774716', { retries: 0 })
    expect(info.address.country).toBe('Česká republika')
    expect(info.address.city).toBeNull()
  })
})

describe('company.search', () => {
  it('POSTs to vyhledat and maps results', async () => {
    const fn = vi.fn(async () =>
      new Response(
        JSON.stringify({ pocetCelkem: 1, ekonomickeSubjekty: [ARES_FIXTURE] }),
        { status: 200 }
      )
    )
    globalThis.fetch = fn as unknown as typeof fetch
    const list = await company.search('Test', { retries: 0, limit: 5 })
    expect(list).toHaveLength(1)
    expect(list[0]!.ico).toBe('64774716')
    const call = fn.mock.calls[0]!
    expect(call[0]).toContain('vyhledat')
    const init = call[1] as { method?: string; body?: string }
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body!)).toMatchObject({ obchodniJmeno: 'Test', pocet: 5 })
  })

  it('returns empty array when nothing found', async () => {
    mockJson({ pocetCelkem: 0, ekonomickeSubjekty: [] })
    const list = await company.search('xxxxxxxxx', { retries: 0 })
    expect(list).toEqual([])
  })
})

describe('company.raw', () => {
  it('returns raw payload', async () => {
    mockJson(ARES_FIXTURE)
    const raw = await company.raw('64774716', { retries: 0 })
    expect(raw).toMatchObject({ ico: '64774716' })
  })
})
