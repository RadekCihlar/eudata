import { describe, it, expect } from 'vitest'
import { padLeft, stripNonDigits, isAllDigits, normalizeWhitespace, parseIsoDate } from '../src/utils.js'

describe('utils', () => {
  it('padLeft', () => {
    expect(padLeft('1', 8)).toBe('00000001')
    expect(padLeft('12345678', 8)).toBe('12345678')
    expect(padLeft('123456789', 8)).toBe('123456789')
  })

  it('stripNonDigits', () => {
    expect(stripNonDigits('CZ 64 77 47-16')).toBe('64774716')
  })

  it('isAllDigits', () => {
    expect(isAllDigits('1234')).toBe(true)
    expect(isAllDigits('12a4')).toBe(false)
    expect(isAllDigits('')).toBe(false)
  })

  it('normalizeWhitespace', () => {
    expect(normalizeWhitespace('  foo   bar\nbaz ')).toBe('foo bar baz')
  })

  it('parseIsoDate accepts ISO', () => {
    expect(parseIsoDate('2026-05-16')).toBe('2026-05-16')
    expect(parseIsoDate('2026-05-16T10:00:00Z')).toBe('2026-05-16')
  })

  it('parseIsoDate accepts Czech d.m.y', () => {
    expect(parseIsoDate('16.5.2026')).toBe('2026-05-16')
    expect(parseIsoDate('1.1.2020')).toBe('2020-01-01')
  })

  it('parseIsoDate returns null for garbage', () => {
    expect(parseIsoDate('hello')).toBeNull()
    expect(parseIsoDate(null)).toBeNull()
  })
})
