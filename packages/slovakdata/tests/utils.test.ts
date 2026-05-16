import { describe, it, expect } from 'vitest'
import { formatICO, validateICO, validateDIC, validateIcDph, normalizeAddress } from '../src/utils.js'

describe('SK formatICO', () => {
  it('pads to 8', () => {
    expect(formatICO('1')).toBe('00000001')
  })
})

describe('SK validateICO', () => {
  it('shares mod-11 algorithm with CZ', () => {
    expect(validateICO('64774716')).toBe(true)
  })
})

describe('validateDIC', () => {
  it('accepts 10 digits', () => {
    expect(validateDIC('1234567890')).toBe(true)
    expect(validateDIC('123')).toBe(false)
  })
})

describe('validateIcDph', () => {
  it('requires SK + 10 digits', () => {
    expect(validateIcDph('SK1234567890')).toBe(true)
    expect(validateIcDph('CZ1234567890')).toBe(false)
  })
})

describe('normalizeAddress', () => {
  it('handles full blob', () => {
    const a = normalizeAddress({ ulica: 'Hlavná', cisloDomu: 1, obec: 'Bratislava', psc: '811 01' })
    expect(a.street).toBe('Hlavná')
    expect(a.city).toBe('Bratislava')
    expect(a.formatted).toContain('Bratislava')
  })

  it('handles null', () => {
    const a = normalizeAddress(null)
    expect(a.country).toBe('Slovenská republika')
  })
})
