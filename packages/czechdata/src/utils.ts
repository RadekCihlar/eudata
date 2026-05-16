import { padLeft, stripNonDigits, validateMod11_8, ValidationError } from 'eudata-common'
import type { CompanyAddress, LegalForm } from './types.js'

export function formatICO(ico: string): string {
  const digits = stripNonDigits(ico)
  if (digits.length === 0 || digits.length > 8) {
    throw new ValidationError(`Invalid ICO: ${ico}`, { source: 'czechdata' })
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
    throw new ValidationError(`Invalid ICO checksum: ${ico}`, { source: 'czechdata' })
  }
  return formatted
}

export function validateDIC(dic: string): boolean {
  const cleaned = dic.replace(/\s+/g, '').toUpperCase()
  return /^CZ\d{8,10}$/.test(cleaned)
}

export function normalizeDIC(dic: string): string {
  return dic.replace(/\s+/g, '').toUpperCase()
}

const legalFormMap: Record<string, LegalForm> = {
  '101': 'sole_trader',
  '102': 'sole_trader',
  '111': 'vos',
  '112': 'ks',
  '113': 'ks',
  '121': 'sro',
  '141': 'sro',
  '151': 'sro',
  '152': 'sro',
  '161': 'sro',
  '162': 'sro',
  '171': 'sro',
  '301': 'cooperative',
  '331': 'cooperative',
  '421': 'foreign_branch',
  '422': 'foreign_branch',
  '521': 'as',
  '631': 'association',
  '641': 'foundation',
  '661': 'foundation',
  '706': 'association',
  '751': 'state_org',
  '801': 'municipality',
  '811': 'municipality',
}

export function decodeLegalForm(code: string | null | undefined): LegalForm {
  if (!code) return 'other'
  return legalFormMap[code] ?? 'other'
}

export function decodeNACE(code: string): string {
  return code
}

export interface AresAddressRaw {
  kodAdresnihoMista?: number | string
  nazevUlice?: string
  cisloDomovni?: number | string
  cisloOrientacni?: number | string
  pismenoOrientacniho?: string
  nazevObce?: string
  nazevCastiObce?: string
  nazevOkresu?: string
  nazevKraje?: string
  psc?: number | string
  textovaAdresa?: string
  nazevStatu?: string
  kodStatu?: string
}

export function normalizeAddress(raw: AresAddressRaw | null | undefined): CompanyAddress {
  const r = raw ?? {}
  const street = r.nazevUlice ?? null
  const houseNumber = r.cisloDomovni != null ? String(r.cisloDomovni) : null
  const orientationNumber =
    r.cisloOrientacni != null
      ? String(r.cisloOrientacni) + (r.pismenoOrientacniho ?? '')
      : null
  const city = r.nazevObce ?? null
  const cityPart = r.nazevCastiObce ?? null
  const district = r.nazevOkresu ?? null
  const region = r.nazevKraje ?? null
  const postalCode = r.psc != null ? String(r.psc) : null
  const country = r.nazevStatu ?? 'Česká republika'
  const ruianAddressCode = r.kodAdresnihoMista != null ? String(r.kodAdresnihoMista) : null

  const formatted =
    r.textovaAdresa ?? buildFormatted({ street, houseNumber, orientationNumber, city, postalCode })

  return {
    formatted,
    street,
    houseNumber,
    orientationNumber,
    city,
    cityPart,
    district,
    region,
    postalCode,
    country,
    ruianAddressCode,
  }
}

function buildFormatted(p: {
  street: string | null
  houseNumber: string | null
  orientationNumber: string | null
  city: string | null
  postalCode: string | null
}): string {
  const parts: string[] = []
  const line1: string[] = []
  if (p.street) line1.push(p.street)
  if (p.houseNumber) {
    line1.push(p.orientationNumber ? `${p.houseNumber}/${p.orientationNumber}` : p.houseNumber)
  }
  if (line1.length > 0) parts.push(line1.join(' '))
  const line2: string[] = []
  if (p.postalCode) line2.push(p.postalCode)
  if (p.city) line2.push(p.city)
  if (line2.length > 0) parts.push(line2.join(' '))
  return parts.join(', ')
}
