/**
 * BIC / SWIFT code (ISO 9362) format validation. Pure utility — no network.
 * 8 chars (BIC8) or 11 chars (BIC11):
 *   - 4 alpha:  institution code
 *   - 2 alpha:  ISO 3166-1 alpha-2 country code
 *   - 2 alnum:  location code
 *   - 3 alnum:  branch code (optional)
 */

export interface BICInfo {
  bic: string
  institutionCode: string
  countryCode: string
  locationCode: string
  branchCode: string | null
  testBic: boolean
  passive: boolean
  reverseBilling: boolean
  valid: boolean
  reason?: string
}

const BIC_RE = /^([A-Z]{4})([A-Z]{2})([A-Z0-9]{2})([A-Z0-9]{3})?$/

export function validateBIC(input: string): boolean {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  return BIC_RE.test(cleaned)
}

export function parseBIC(input: string): BICInfo {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  const m = BIC_RE.exec(cleaned)
  if (!m) {
    return {
      bic: cleaned,
      institutionCode: '',
      countryCode: '',
      locationCode: '',
      branchCode: null,
      testBic: false,
      passive: false,
      reverseBilling: false,
      valid: false,
      reason: 'Invalid format: expect 8 or 11 alphanumeric chars per ISO 9362',
    }
  }
  const location = m[3]!
  return {
    bic: cleaned,
    institutionCode: m[1]!,
    countryCode: m[2]!,
    locationCode: location,
    branchCode: m[4] ?? null,
    testBic: location.endsWith('0'),
    passive: location.endsWith('1'),
    reverseBilling: location.endsWith('2'),
    valid: true,
  }
}
