/**
 * LEI (Legal Entity Identifier, ISO 17442) validation. Pure utility — no network.
 * 20 alphanumeric characters; last 2 digits are ISO/IEC 7064 mod-97-10 check.
 */

export interface LEIInfo {
  lei: string
  louPrefix: string
  reserved: string
  entityPart: string
  checkDigits: string
  valid: boolean
  reason?: string
}

function lei97Check(input: string): boolean {
  let remainder = 0
  for (const ch of input) {
    let v: number
    if (ch >= '0' && ch <= '9') v = ch.charCodeAt(0) - 48
    else if (ch >= 'A' && ch <= 'Z') v = ch.charCodeAt(0) - 55
    else return false
    if (v < 10) {
      remainder = (remainder * 10 + v) % 97
    } else {
      remainder = (remainder * 100 + v) % 97
    }
  }
  return remainder === 1
}

export function validateLEI(input: string): boolean {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z0-9]{18}[0-9]{2}$/.test(cleaned)) return false
  return lei97Check(cleaned)
}

export function parseLEI(input: string): LEIInfo {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z0-9]{18}[0-9]{2}$/.test(cleaned)) {
    return {
      lei: cleaned,
      louPrefix: '',
      reserved: '',
      entityPart: '',
      checkDigits: '',
      valid: false,
      reason: 'Invalid format: expect 20 chars, last 2 numeric',
    }
  }
  const louPrefix = cleaned.slice(0, 4)
  const reserved = cleaned.slice(4, 6)
  const entityPart = cleaned.slice(6, 18)
  const checkDigits = cleaned.slice(18, 20)
  const valid = lei97Check(cleaned)
  return {
    lei: cleaned,
    louPrefix,
    reserved,
    entityPart,
    checkDigits,
    valid,
    reason: valid ? undefined : 'ISO/IEC 7064 mod-97 check failed',
  }
}
