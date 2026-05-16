import { describe, it, expect } from 'vitest'
import { validateMod11_8, validateNipChecksum, validateRegonChecksum } from '../src/checksum.js'

describe('validateMod11_8 (CZ/SK IČO)', () => {
  it('accepts known valid Czech ICO', () => {
    expect(validateMod11_8('64774716')).toBe(true)
  })

  it('rejects invalid checksum', () => {
    expect(validateMod11_8('64774717')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(validateMod11_8('123')).toBe(false)
    expect(validateMod11_8('123456789')).toBe(false)
  })

  it('rejects non-digits', () => {
    expect(validateMod11_8('1234567a')).toBe(false)
  })

  it('accepts mod==0 case → check digit must be 1', () => {
    expect(validateMod11_8('00000001')).toBe(true)
  })
})

describe('validateNipChecksum (PL)', () => {
  it('accepts valid NIP', () => {
    expect(validateNipChecksum('5213003798')).toBe(true)
  })

  it('rejects invalid checksum', () => {
    expect(validateNipChecksum('5213003799')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(validateNipChecksum('521300379')).toBe(false)
  })
})

describe('validateRegonChecksum (PL)', () => {
  it('rejects wrong length', () => {
    expect(validateRegonChecksum('12345')).toBe(false)
  })

  it('accepts 9-digit REGON with valid checksum', () => {
    expect(validateRegonChecksum('123456785')).toBe(true)
  })
})
