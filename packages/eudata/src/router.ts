import { validateMod11_8, validateNipChecksum } from 'eudata-common'
import type { CountryCode } from './types.js'

export function detectCountry(id: string): CountryCode | null {
  const cleaned = id.replace(/\s+/g, '').toUpperCase()
  if (cleaned.startsWith('CZ')) return 'CZ'
  if (cleaned.startsWith('SK')) return 'SK'
  if (cleaned.startsWith('PL')) return 'PL'

  const digits = cleaned.replace(/\D/g, '')
  if (digits.length === 8 && validateMod11_8(digits)) return 'CZ'
  if (digits.length === 10 && validateNipChecksum(digits)) return 'PL'
  if (digits.length === 8) return 'CZ'
  return null
}

export function stripCountryPrefix(id: string): string {
  const cleaned = id.replace(/\s+/g, '').toUpperCase()
  return cleaned.replace(/^(CZ|SK|PL)/, '')
}
