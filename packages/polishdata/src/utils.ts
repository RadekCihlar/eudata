import {
  padLeft,
  stripNonDigits,
  validateNipChecksum,
  validateRegonChecksum,
  ValidationError,
} from 'eudata-common'
import type { PLAddress } from './types.js'

export function formatNIP(nip: string): string {
  return stripNonDigits(nip)
}

export function validateNIP(nip: string): boolean {
  return validateNipChecksum(formatNIP(nip))
}

export function assertValidNIP(nip: string): string {
  const cleaned = formatNIP(nip)
  if (!validateNipChecksum(cleaned)) {
    throw new ValidationError(`Invalid NIP checksum: ${nip}`, { source: 'polishdata' })
  }
  return cleaned
}

export function formatKRS(krs: string): string {
  const digits = stripNonDigits(krs)
  if (digits.length === 0 || digits.length > 10) {
    throw new ValidationError(`Invalid KRS: ${krs}`, { source: 'polishdata' })
  }
  return padLeft(digits, 10)
}

export function validateKRS(krs: string): boolean {
  const digits = stripNonDigits(krs)
  return digits.length > 0 && digits.length <= 10
}

export function formatREGON(regon: string): string {
  return stripNonDigits(regon)
}

export function validateREGON(regon: string): boolean {
  return validateRegonChecksum(formatREGON(regon))
}

export interface KrsAddressRaw {
  ulica?: string
  numerBudynku?: string | number
  numerLokalu?: string | number
  miejscowosc?: string
  kodPocztowy?: string
  wojewodztwo?: string
  kraj?: string
}

export function normalizeAddress(raw: KrsAddressRaw | null | undefined): PLAddress {
  const r = raw ?? {}
  const street = r.ulica ?? null
  const buildingNumber = r.numerBudynku != null ? String(r.numerBudynku) : null
  const apartmentNumber = r.numerLokalu != null ? String(r.numerLokalu) : null
  const city = r.miejscowosc ?? null
  const postalCode = r.kodPocztowy ?? null
  const voivodeship = r.wojewodztwo ?? null
  const country = r.kraj ?? 'Polska'
  const line1 = [street, [buildingNumber, apartmentNumber].filter(Boolean).join('/')].filter(Boolean).join(' ')
  const line2 = [postalCode, city].filter(Boolean).join(' ')
  return {
    formatted: [line1, line2].filter(Boolean).join(', '),
    street,
    buildingNumber,
    apartmentNumber,
    city,
    postalCode,
    voivodeship,
    country,
  }
}
