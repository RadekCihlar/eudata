/**
 * Polish PESEL validation and parsing. Pure utility — no network.
 * Encodes: YYMMDD + 4-digit serial + checksum digit.
 * The DOB century is encoded into the month (see CENTURY_OFFSETS).
 */

const PESEL_WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]

const CENTURY_OFFSETS: Array<{ offset: number; century: number }> = [
  { offset: 80, century: 1800 },
  { offset: 0, century: 1900 },
  { offset: 20, century: 2000 },
  { offset: 40, century: 2100 },
  { offset: 60, century: 2200 },
]

export interface PESELInfo {
  pesel: string
  valid: boolean
  dateOfBirth: string | null
  gender: 'male' | 'female' | null
  reason?: string
}

export function validatePESEL(pesel: string): boolean {
  const cleaned = pesel.replace(/\s+/g, '')
  if (!/^\d{11}$/.test(cleaned)) return false
  let sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cleaned[i]) * PESEL_WEIGHTS[i]!
  const check = (10 - (sum % 10)) % 10
  return Number(cleaned[10]) === check
}

export function parsePESEL(pesel: string): PESELInfo {
  const cleaned = pesel.replace(/\s+/g, '')
  if (!/^\d{11}$/.test(cleaned)) {
    return { pesel: cleaned, valid: false, dateOfBirth: null, gender: null, reason: 'Must be 11 digits' }
  }
  const valid = validatePESEL(cleaned)
  const yy = Number(cleaned.slice(0, 2))
  const mmEncoded = Number(cleaned.slice(2, 4))
  const dd = Number(cleaned.slice(4, 6))
  const centuryEntry = CENTURY_OFFSETS.find((c) => mmEncoded > c.offset && mmEncoded <= c.offset + 12)
  let dateOfBirth: string | null = null
  if (centuryEntry) {
    const year = centuryEntry.century + yy
    const month = mmEncoded - centuryEntry.offset
    if (month >= 1 && month <= 12 && dd >= 1 && dd <= 31) {
      dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
  }
  const genderDigit = Number(cleaned[9])
  const gender: 'male' | 'female' = genderDigit % 2 === 0 ? 'female' : 'male'
  const result: PESELInfo = { pesel: cleaned, valid, dateOfBirth, gender }
  if (!valid) result.reason = 'Checksum invalid'
  return result
}
