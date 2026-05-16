import { padLeft, stripNonDigits, validateMod11_8, ValidationError } from 'eudata-common'
import type { SKAddress } from './types.js'

export function formatICO(ico: string): string {
  const digits = stripNonDigits(ico)
  if (digits.length === 0 || digits.length > 8) {
    throw new ValidationError(`Invalid SK ICO: ${ico}`, { source: 'slovakdata' })
  }
  return padLeft(digits, 8)
}

export function validateICO(ico: string): boolean {
  const digits = stripNonDigits(ico)
  if (digits.length === 0 || digits.length > 8) return false
  return validateMod11_8(padLeft(digits, 8))
}

export function assertValidICO(ico: string): string {
  const formatted = formatICO(ico)
  if (!validateMod11_8(formatted)) {
    throw new ValidationError(`Invalid SK ICO checksum: ${ico}`, { source: 'slovakdata' })
  }
  return formatted
}

export function validateDIC(dic: string): boolean {
  return /^\d{10}$/.test(dic.replace(/\s+/g, ''))
}

export function validateIcDph(icDph: string): boolean {
  return /^SK\d{10}$/i.test(icDph.replace(/\s+/g, ''))
}

export interface OrsfAddressRaw {
  ulica?: string
  cisloDomu?: string | number
  obec?: string
  psc?: string
  stat?: string
}

export function normalizeAddress(raw: OrsfAddressRaw | null | undefined): SKAddress {
  const r = raw ?? {}
  const street = r.ulica ?? null
  const houseNumber = r.cisloDomu != null ? String(r.cisloDomu) : null
  const city = r.obec ?? null
  const postalCode = r.psc ?? null
  const country = r.stat ?? 'Slovenská republika'
  const line1 = [street, houseNumber].filter(Boolean).join(' ')
  const line2 = [postalCode, city].filter(Boolean).join(' ')
  const formatted = [line1, line2].filter(Boolean).join(', ')
  return { formatted, street, houseNumber, city, postalCode, country }
}
