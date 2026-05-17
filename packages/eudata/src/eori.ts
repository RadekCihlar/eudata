import { fetchText } from 'eudata-common'
import type { RequestOptions } from './types.js'

const EORI_SOAP = 'https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation'

const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI',
  'SK', 'XI',
])

export interface EORIFormat {
  eori: string
  countryCode: string
  identifier: string
  formatValid: boolean
  reason?: string
}

export interface EORIValidation {
  eori: string
  valid: boolean
  name: string | null
  address: string | null
  requestDate: string
}

function clean(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}

function buildSoapEnvelope(eori: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:val="http://eori.ws.eos.dds.s/">
  <soapenv:Body>
    <val:validateEORI>
      <val:eori>${eori}</val:eori>
    </val:validateEORI>
  </soapenv:Body>
</soapenv:Envelope>`
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`)
  const m = re.exec(xml)
  return m ? m[1]!.trim() : null
}

export const eori = {
  validate(input: string): EORIFormat {
    const eori = clean(input)
    const m = /^([A-Z]{2})([A-Z0-9]{1,17})$/.exec(eori)
    if (!m) {
      return { eori, countryCode: '', identifier: '', formatValid: false, reason: 'Bad format: expect 2-letter country + 1-17 alphanumerics' }
    }
    const cc = m[1]!
    if (!EU_COUNTRIES.has(cc)) {
      return { eori, countryCode: cc, identifier: m[2]!, formatValid: false, reason: `Unknown EU country code: ${cc}` }
    }
    return { eori, countryCode: cc, identifier: m[2]!, formatValid: true }
  },

  async lookup(input: string, opts?: RequestOptions): Promise<EORIValidation> {
    const fmt = eori.validate(input)
    if (!fmt.formatValid) {
      return { eori: fmt.eori, valid: false, name: null, address: null, requestDate: new Date().toISOString() }
    }
    const xml = await fetchText(EORI_SOAP, {
      ...(opts ?? {}),
      source: 'eu:eori',
      method: 'POST',
      body: buildSoapEnvelope(fmt.eori),
      contentType: 'text/xml; charset=utf-8',
      headers: { soapaction: '' },
    })
    return {
      eori: fmt.eori,
      valid: /<(?:[a-zA-Z0-9]+:)?statusDescr[^>]*>\s*Valid/i.test(xml) ||
             extractTag(xml, 'status') === '0',
      name: extractTag(xml, 'name'),
      address: extractTag(xml, 'address'),
      requestDate: extractTag(xml, 'requestDate') ?? new Date().toISOString(),
    }
  },
}
