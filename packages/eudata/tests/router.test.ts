import { describe, it, expect } from 'vitest'
import { detectCountry, stripCountryPrefix } from '../src/router.js'

describe('detectCountry', () => {
  it('detects CZ prefix', () => {
    expect(detectCountry('CZ64774716')).toBe('CZ')
  })

  it('detects SK prefix', () => {
    expect(detectCountry('SK2020123456')).toBe('SK')
  })

  it('detects PL prefix', () => {
    expect(detectCountry('PL5213003798')).toBe('PL')
  })

  it('detects 8-digit (CZ/SK) by checksum → CZ default', () => {
    expect(detectCountry('64774716')).toBe('CZ')
  })

  it('detects 10-digit PL by NIP checksum', () => {
    expect(detectCountry('5213003798')).toBe('PL')
  })

  it('returns null for garbage', () => {
    expect(detectCountry('xyz')).toBeNull()
  })
})

describe('stripCountryPrefix', () => {
  it('removes country code', () => {
    expect(stripCountryPrefix('CZ64774716')).toBe('64774716')
    expect(stripCountryPrefix('PL5213003798')).toBe('5213003798')
  })

  it('leaves bare digits alone', () => {
    expect(stripCountryPrefix('64774716')).toBe('64774716')
  })

  it('handles whitespace and lowercase', () => {
    expect(stripCountryPrefix(' cz 64774716 ')).toBe('64774716')
  })
})
