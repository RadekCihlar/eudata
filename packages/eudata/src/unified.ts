import * as cz from 'czechdata'
import * as sk from 'slovakdata'
import * as pl from 'polishdata'
import type { RequestOptions } from 'eudata-common'
import { detectCountry, stripCountryPrefix } from './router.js'
import type { CountryCode } from './types.js'

function resolveCountry(country: CountryCode | string, id: string): CountryCode {
  if (country === 'CZ' || country === 'SK' || country === 'PL') return country
  const detected = detectCountry(country)
  if (detected) return detected
  const detectedFromId = detectCountry(id)
  if (detectedFromId) return detectedFromId
  throw new Error(`Cannot determine country for id: ${id}`)
}

export const company = {
  lookup(country: CountryCode | string, id: string, opts?: RequestOptions): Promise<unknown> {
    const idStripped = stripCountryPrefix(id)
    const resolved = resolveCountry(country, id)
    if (resolved === 'CZ') return cz.company.lookup(idStripped, opts)
    if (resolved === 'SK') return sk.company.lookup(idStripped, opts)
    return pl.company.byNIP(idStripped, opts)
  },
}

export const vat = {
  check(country: CountryCode | string, id: string, opts?: RequestOptions): Promise<unknown> {
    const idStripped = stripCountryPrefix(id)
    const resolved = resolveCountry(country, id)
    if (resolved === 'CZ') return cz.vat.check(idStripped, opts)
    if (resolved === 'SK') return sk.vat.check(idStripped, opts)
    return pl.vat.check(idStripped, opts)
  },
}

export const insolvency = {
  check(country: CountryCode | string, id: string, opts?: RequestOptions): Promise<unknown> {
    const idStripped = stripCountryPrefix(id)
    const resolved = resolveCountry(country, id)
    if (resolved === 'CZ') return cz.insolvency.check(idStripped, opts)
    if (resolved === 'SK') return sk.insolvency.check(idStripped, opts)
    return pl.insolvency.check(idStripped, opts)
  },
}

export const risk = {
  assess(country: CountryCode | string, id: string, opts?: RequestOptions): Promise<unknown> {
    const idStripped = stripCountryPrefix(id)
    const resolved = resolveCountry(country, id)
    if (resolved === 'CZ') return cz.risk.assess(idStripped, opts)
    if (resolved === 'SK') return sk.risk.assess(idStripped, opts)
    return pl.risk.assess(idStripped, opts)
  },

  async batchMultiCountry(
    queries: Array<{ country: CountryCode; id: string }>,
    opts?: RequestOptions
  ): Promise<unknown[]> {
    return Promise.all(queries.map((q) => risk.assess(q.country, q.id, opts)))
  },
}
