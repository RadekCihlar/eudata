import { describe, it, expect } from 'vitest'
import {
  formatICO,
  validateICO,
  assertValidICO,
  validateDIC,
  normalizeDIC,
  decodeLegalForm,
  normalizeAddress,
} from '../src/utils.js'
import { ValidationError } from 'eudata-common'

describe('formatICO', () => {
  it('pads to 8 digits', () => {
    expect(formatICO('123')).toBe('00000123')
    expect(formatICO('64774716')).toBe('64774716')
  })

  it('strips non-digits before padding', () => {
    expect(formatICO('CZ 647-747-16')).toBe('64774716')
  })

  it('throws on too long', () => {
    expect(() => formatICO('123456789')).toThrow(ValidationError)
  })

  it('throws on empty', () => {
    expect(() => formatICO('abc')).toThrow(ValidationError)
  })
})

describe('validateICO', () => {
  it('accepts known good', () => {
    expect(validateICO('64774716')).toBe(true)
  })

  it('accepts unpadded input', () => {
    expect(validateICO('1')).toBe(validateICO('00000001'))
  })

  it('rejects bad checksum', () => {
    expect(validateICO('64774717')).toBe(false)
  })
})

describe('assertValidICO', () => {
  it('returns padded ICO on success', () => {
    expect(assertValidICO('64774716')).toBe('64774716')
  })

  it('throws on bad checksum', () => {
    expect(() => assertValidICO('64774717')).toThrow(ValidationError)
  })
})

describe('validateDIC', () => {
  it('accepts CZ + 8 digits', () => {
    expect(validateDIC('CZ64774716')).toBe(true)
  })

  it('accepts CZ + 10 digits (natural person)', () => {
    expect(validateDIC('CZ1234567890')).toBe(true)
  })

  it('rejects without CZ prefix', () => {
    expect(validateDIC('64774716')).toBe(false)
  })

  it('handles whitespace + case', () => {
    expect(validateDIC(' cz 64774716 ')).toBe(true)
  })
})

describe('normalizeDIC', () => {
  it('uppercases and strips whitespace', () => {
    expect(normalizeDIC(' cz 64774716 ')).toBe('CZ64774716')
  })
})

describe('decodeLegalForm', () => {
  it('maps known codes correctly', () => {
    expect(decodeLegalForm('112')).toBe('sro')
    expect(decodeLegalForm('121')).toBe('as')
    expect(decodeLegalForm('521')).toBe('as')
    expect(decodeLegalForm('101')).toBe('sole_trader')
    expect(decodeLegalForm('205')).toBe('cooperative')
  })

  it('returns "other" for unknown', () => {
    expect(decodeLegalForm('999')).toBe('other')
    expect(decodeLegalForm(null)).toBe('other')
  })
})

describe('normalizeAddress', () => {
  it('handles full ARES blob', () => {
    const addr = normalizeAddress({
      nazevUlice: 'Wenceslas Square',
      cisloDomovni: 1,
      cisloOrientacni: 2,
      nazevObce: 'Praha',
      psc: 11000,
      nazevStatu: 'Česká republika',
      kodAdresnihoMista: 12345,
    })
    expect(addr.street).toBe('Wenceslas Square')
    expect(addr.houseNumber).toBe('1')
    expect(addr.orientationNumber).toBe('2')
    expect(addr.city).toBe('Praha')
    expect(addr.postalCode).toBe('11000')
    expect(addr.ruianAddressCode).toBe('12345')
    expect(addr.formatted).toContain('Wenceslas')
    expect(addr.formatted).toContain('Praha')
  })

  it('handles null input', () => {
    const addr = normalizeAddress(null)
    expect(addr.city).toBeNull()
    expect(addr.country).toBe('Česká republika')
  })

  it('uses textovaAdresa when present', () => {
    const addr = normalizeAddress({ textovaAdresa: 'preformatted address line' })
    expect(addr.formatted).toBe('preformatted address line')
  })
})
