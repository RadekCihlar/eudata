import { describe, it, expect } from 'vitest'
import { validateIBAN, parseIBAN, formatIBAN } from '../src/iban.js'

describe('validateIBAN', () => {
  it('accepts known valid IBANs', () => {
    expect(validateIBAN('GB82 WEST 1234 5698 7654 32')).toBe(true)
    expect(validateIBAN('DE89370400440532013000')).toBe(true)
    expect(validateIBAN('CZ65 0800 0000 1920 0014 5399')).toBe(true)
    expect(validateIBAN('PL61109010140000071219812874')).toBe(true)
    expect(validateIBAN('SK3112000000198742637541')).toBe(true)
  })

  it('rejects bad checksum', () => {
    expect(validateIBAN('GB82WEST12345698765433')).toBe(false)
  })

  it('rejects wrong length per country', () => {
    expect(validateIBAN('CZ650800')).toBe(false)
  })

  it('rejects unknown country', () => {
    expect(validateIBAN('ZZ1234567890')).toBe(false)
  })
})

describe('parseIBAN', () => {
  it('parses CZ IBAN', () => {
    const r = parseIBAN('CZ6508000000192000145399')
    expect(r.countryCode).toBe('CZ')
    expect(r.checkDigits).toBe('65')
    expect(r.bankCode).toBe('0800')
    expect(r.valid).toBe(true)
  })

  it('marks invalid with reason', () => {
    const r = parseIBAN('CZ6608000000192000145399')
    expect(r.valid).toBe(false)
    expect(r.reason).toBeTruthy()
  })
})

describe('formatIBAN', () => {
  it('groups in 4-char blocks', () => {
    expect(formatIBAN('CZ6508000000192000145399')).toBe('CZ65 0800 0000 1920 0014 5399')
  })
})
