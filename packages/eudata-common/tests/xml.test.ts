import { describe, it, expect } from 'vitest'
import { xmlTagText, xmlTagTextAll, decodeXmlEntities, encodeXmlEntities } from '../src/xml.js'

describe('xml helpers', () => {
  it('extracts a tag value', () => {
    expect(xmlTagText('<a>1</a><b>2</b>', 'a')).toBe('1')
  })

  it('handles namespaced tags', () => {
    expect(xmlTagText('<soap:Envelope><dic>CZ123</dic></soap:Envelope>', 'dic')).toBe('CZ123')
  })

  it('returns null for missing tag', () => {
    expect(xmlTagText('<a>1</a>', 'b')).toBeNull()
  })

  it('extracts multiple values', () => {
    expect(xmlTagTextAll('<x>1</x><x>2</x><x>3</x>', 'x')).toEqual(['1', '2', '3'])
  })

  it('decodes entities', () => {
    expect(decodeXmlEntities('Tom &amp; Jerry &lt;3 &#65;')).toBe('Tom & Jerry <3 A')
  })

  it('encodes entities', () => {
    expect(encodeXmlEntities('Tom & Jerry <3 "x"')).toBe('Tom &amp; Jerry &lt;3 &quot;x&quot;')
  })
})
