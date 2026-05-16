import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { vat } from '../src/vat.js'
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

function mockSequence(responses: Array<{ body: string; status?: number }>): void {
  let i = 0
  globalThis.fetch = vi.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1]!
    return new Response(r.body, { status: r.status ?? 200 })
  }) as unknown as typeof fetch
}

const SOAP_RELIABLE = `<?xml version="1.0"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <statusPlatceDPH>SPOLEHLIVY</statusPlatceDPH>
    <nespolehlivyPlatce>NE</nespolehlivyPlatce>
    <ucet>
      <standardizovanyUcet>CZ6508000000192000145399</standardizovanyUcet>
      <cisloUctu>192000145399</cisloUctu>
      <kodBanky>0800</kodBanky>
      <datumZverejneniUctu>2020-01-01</datumZverejneniUctu>
    </ucet>
  </soapenv:Body>
</soapenv:Envelope>`

const SOAP_UNRELIABLE = `<?xml version="1.0"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <statusPlatceDPH>NESPOLEHLIVY</statusPlatceDPH>
    <nespolehlivyPlatce>ANO</nespolehlivyPlatce>
    <datumZverejneninespolehlivosti>2023-06-15</datumZverejneninespolehlivosti>
  </soapenv:Body>
</soapenv:Envelope>`

describe('vat.check', () => {
  it('accepts DIC input', async () => {
    mockSequence([{ body: SOAP_RELIABLE }])
    const info = await vat.check('CZ64774716', { retries: 0 })
    expect(info.dic).toBe('CZ64774716')
    expect(info.vatPayer).toBe(true)
    expect(info.unreliable).toBe(false)
    expect(info.bankAccounts).toHaveLength(1)
    expect(info.bankAccounts[0]!.iban).toBe('CZ6508000000192000145399')
  })

  it('accepts ICO input (constructs DIC)', async () => {
    mockSequence([{ body: SOAP_RELIABLE }])
    const info = await vat.check('64774716', { retries: 0 })
    expect(info.dic).toBe('CZ64774716')
  })

  it('marks unreliable when ANO', async () => {
    mockSequence([{ body: SOAP_UNRELIABLE }])
    const info = await vat.check('CZ64774716', { retries: 0 })
    expect(info.unreliable).toBe(true)
    expect(info.unreliableSince).toBe('2023-06-15')
  })

  it('falls back to ARES on SOAP failure', async () => {
    mockSequence([
      { body: 'ERR', status: 500 },
      {
        body: JSON.stringify({
          ico: '64774716',
          dic: 'CZ64774716',
          seznamRegistraci: { stavZdrojeDph: 'AKTIVNI' },
        }),
      },
    ])
    const info = await vat.check('64774716', { retries: 0 })
    expect(info.vatPayer).toBe(true)
    expect(info.dic).toBe('CZ64774716')
    expect(info.bankAccounts).toEqual([])
  })

  it('rejects invalid ICO checksum', async () => {
    await expect(vat.check('64774717', { retries: 0 })).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('vat.isUnreliable', () => {
  it('returns boolean shortcut', async () => {
    mockSequence([{ body: SOAP_UNRELIABLE }])
    expect(await vat.isUnreliable('CZ64774716', { retries: 0 })).toBe(true)
  })
})

describe('vat.bankAccounts', () => {
  it('returns parsed accounts', async () => {
    mockSequence([{ body: SOAP_RELIABLE }])
    const accounts = await vat.bankAccounts('CZ64774716', { retries: 0 })
    expect(accounts).toHaveLength(1)
    expect(accounts[0]!.bankCode).toBe('0800')
  })
})
