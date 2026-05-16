import * as cz from 'czechdata'
import * as sk from 'slovakdata'
import * as pl from 'polishdata'
import { validateMod11_8, validateNipChecksum } from 'eudata-common'
import { lei } from './lei.js'
import type { CountryCode, LEIRecord } from './types.js'

export interface UniversalResult {
  country: CountryCode | null
  idType: 'ICO' | 'NIP' | 'KRS' | 'name' | 'lei' | 'unknown'
  query: string
  company: unknown | null
  vat: unknown | null
  insolvency: unknown | null
  lei: LEIRecord | null
  errors: Array<{ source: string; message: string }>
  elapsedMs: number
}

function classify(query: string): { country: CountryCode | null; idType: UniversalResult['idType']; normalized: string } {
  const cleaned = query.replace(/\s+/g, '').toUpperCase()
  if (/^[A-Z0-9]{20}$/.test(cleaned)) return { country: null, idType: 'lei', normalized: cleaned }
  if (/^CZ\d{8,10}$/.test(cleaned)) return { country: 'CZ', idType: 'ICO', normalized: cleaned.replace(/^CZ/, '') }
  if (/^SK\d{10}$/.test(cleaned)) return { country: 'SK', idType: 'ICO', normalized: cleaned.replace(/^SK/, '').slice(0, 8) }
  if (/^PL\d{10}$/.test(cleaned)) return { country: 'PL', idType: 'NIP', normalized: cleaned.replace(/^PL/, '') }
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length === 10 && validateNipChecksum(digits)) return { country: 'PL', idType: 'NIP', normalized: digits }
  if (digits.length === 10 && digits.startsWith('0000')) return { country: 'PL', idType: 'KRS', normalized: digits }
  if (digits.length === 8 && validateMod11_8(digits)) return { country: 'CZ', idType: 'ICO', normalized: digits }
  if (digits.length >= 1 && digits.length <= 8) return { country: 'CZ', idType: 'ICO', normalized: digits.padStart(8, '0') }
  return { country: null, idType: 'name', normalized: query.trim() }
}

async function safe<T>(label: string, fn: () => Promise<T>, errors: UniversalResult['errors']): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    errors.push({ source: label, message: (e as Error).message })
    return null
  }
}

export async function lookup(query: string): Promise<UniversalResult> {
  const start = Date.now()
  const { country, idType, normalized } = classify(query)
  const errors: UniversalResult['errors'] = []
  const out: UniversalResult = {
    country,
    idType,
    query,
    company: null,
    vat: null,
    insolvency: null,
    lei: null,
    elapsedMs: 0,
    errors,
  }

  if (idType === 'lei') {
    out.lei = await safe('gleif:lookup', () => lei.lookup(normalized), errors)
    out.elapsedMs = Date.now() - start
    return out
  }

  if (idType === 'name') {
    out.lei = (await safe('gleif:search', async () => (await lei.search(normalized))[0] ?? null, errors)) ?? null
    out.elapsedMs = Date.now() - start
    return out
  }

  if (country === 'CZ' && idType === 'ICO') {
    const [companyRes, insolvencyRes, vatRes] = await Promise.all([
      safe('cz:ares', () => cz.company.lookup(normalized), errors),
      safe('cz:isir', () => cz.insolvency.check(normalized), errors),
      safe('cz:vat', () => cz.vat.check(normalized), errors),
    ])
    out.company = companyRes
    out.insolvency = insolvencyRes
    out.vat = vatRes
    // CZ and SK share the mod-11 checksum — if CZ found nothing, fall back to SK ORSR
    if (!companyRes) {
      const sknormalized = normalized.padStart(8, '0').slice(-8)
      const skTry = await safe('sk:orsr', () => sk.company.lookup(sknormalized), errors)
      if (skTry) {
        out.country = 'SK'
        out.company = skTry
      }
    }
  } else if (country === 'SK' && idType === 'ICO') {
    out.company = await safe('sk:orsr', () => sk.company.lookup(normalized), errors)
  } else if (country === 'PL' && idType === 'NIP') {
    const [vatRes, soleRes] = await Promise.all([
      safe('pl:wl', () => pl.vat.check(normalized), errors),
      safe('pl:ceidg', () => pl.soleTrader.byNIP(normalized), errors),
    ])
    out.vat = vatRes
    out.company = soleRes ?? null
    const vatTyped = vatRes as { krs?: string | null } | null
    if (!out.company && vatTyped?.krs) {
      out.company = await safe('pl:krs', () => pl.company.byKRS(vatTyped.krs!), errors)
    }
  } else if (country === 'PL' && idType === 'KRS') {
    out.company = await safe('pl:krs', () => pl.company.byKRS(normalized), errors)
  }

  if (country && !out.lei) {
    const companyName = (out.company as { name?: string } | null)?.name
    const vatName = (out.vat as { name?: string } | null)?.name
    const name = companyName ?? vatName
    if (name) {
      out.lei = (await safe('gleif:search', async () => (await lei.search(name))[0] ?? null, errors)) ?? null
    }
  }

  out.elapsedMs = Date.now() - start
  return out
}

export const universal = { lookup, classify }
