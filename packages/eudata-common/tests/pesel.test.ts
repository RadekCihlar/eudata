import { describe, it, expect } from 'vitest'
import { validatePESEL, parsePESEL } from '../src/pesel.js'

describe('validatePESEL', () => {
  it('accepts known valid PESEL', () => {
    expect(validatePESEL('44051401359')).toBe(true)
  })

  it('rejects bad checksum', () => {
    expect(validatePESEL('44051401358')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(validatePESEL('1234')).toBe(false)
  })
})

describe('parsePESEL', () => {
  it('extracts DOB and gender', () => {
    const r = parsePESEL('44051401359')
    expect(r.valid).toBe(true)
    expect(r.dateOfBirth).toBe('1944-05-14')
    expect(r.gender).toBe('male')
  })

  it('handles 2000s with offset 20', () => {
    const r = parsePESEL('02250906309')
    // year=2002, month=05 (25-20), day=09
    expect(r.dateOfBirth).toBe('2002-05-09')
  })

  it('reports reason on invalid', () => {
    const r = parsePESEL('12345678901')
    expect(r.valid).toBe(false)
    expect(r.reason).toBeTruthy()
  })
})
