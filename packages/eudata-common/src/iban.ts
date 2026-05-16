/**
 * IBAN validation and parsing. Pure utility — no network.
 * Implements ISO 13616 mod-97 checksum and country-specific length table.
 */

const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28,
  EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26,
  IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18,
  NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24,
  SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24,
  TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
}

export interface IBANInfo {
  iban: string
  countryCode: string
  checkDigits: string
  bban: string
  bankCode: string | null
  accountNumber: string | null
  valid: boolean
  reason?: string
}

function normalize(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase()
}

function mod97(s: string): number {
  let r = 0
  for (const ch of s) r = (r * 10 + Number(ch)) % 97
  return r
}

function expand(iban: string): string {
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let out = ''
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') out += ch
    else if (ch >= 'A' && ch <= 'Z') out += String(ch.charCodeAt(0) - 55)
    else return ''
  }
  return out
}

export function validateIBAN(input: string): boolean {
  const iban = normalize(input)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false
  const country = iban.slice(0, 2)
  const expectedLen = IBAN_LENGTHS[country]
  if (!expectedLen || iban.length !== expectedLen) return false
  const expanded = expand(iban)
  if (!expanded) return false
  return mod97(expanded) === 1
}

const BANK_CODE_RANGES: Record<string, [number, number]> = {
  CZ: [4, 8],
  SK: [4, 8],
  PL: [4, 12],
  DE: [4, 12],
  AT: [4, 9],
  FR: [4, 9],
  GB: [4, 10],
  IT: [5, 10],
  ES: [4, 8],
}

export function parseIBAN(input: string): IBANInfo {
  const iban = normalize(input)
  if (iban.length < 4) {
    return {
      iban,
      countryCode: '',
      checkDigits: '',
      bban: '',
      bankCode: null,
      accountNumber: null,
      valid: false,
      reason: 'Too short',
    }
  }
  const countryCode = iban.slice(0, 2)
  const checkDigits = iban.slice(2, 4)
  const bban = iban.slice(4)
  const valid = validateIBAN(iban)
  const range = BANK_CODE_RANGES[countryCode]
  const bankCode = range ? iban.slice(range[0], range[1]) : null
  const accountNumber = range ? iban.slice(range[1]) : bban
  const result: IBANInfo = {
    iban,
    countryCode,
    checkDigits,
    bban,
    bankCode,
    accountNumber,
    valid,
  }
  if (!valid) result.reason = 'Checksum or length invalid'
  return result
}

export function formatIBAN(input: string, separator = ' '): string {
  const iban = normalize(input)
  return iban.replace(/(.{4})/g, `$1${separator}`).trim()
}
