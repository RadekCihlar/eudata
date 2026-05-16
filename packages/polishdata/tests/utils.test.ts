import { describe, it, expect } from 'vitest'
import {
  formatNIP,
  validateNIP,
  assertValidNIP,
  formatKRS,
  validateKRS,
  validateREGON,
} from '../src/utils.js'
import { ValidationError } from 'eudata-common'

describe('NIP', () => {
  it('validateNIP accepts good NIP', () => {
    expect(validateNIP('5213003798')).toBe(true)
  })

  it('strips dashes', () => {
    expect(formatNIP('521-300-37-98')).toBe('5213003798')
    expect(validateNIP('521-300-37-98')).toBe(true)
  })

  it('rejects bad checksum', () => {
    expect(validateNIP('5213003799')).toBe(false)
  })

  it('assertValidNIP throws on bad input', () => {
    expect(() => assertValidNIP('5213003799')).toThrow(ValidationError)
  })
})

describe('KRS', () => {
  it('pads to 10 digits', () => {
    expect(formatKRS('123')).toBe('0000000123')
  })

  it('validateKRS rejects too long', () => {
    expect(validateKRS('12345678901')).toBe(false)
  })
})

describe('REGON', () => {
  it('accepts 9-digit valid REGON', () => {
    expect(validateREGON('123456785')).toBe(true)
  })

  it('rejects invalid', () => {
    expect(validateREGON('123456789')).toBe(false)
  })
})
