import { fetchText, xmlTagText, xmlTagTextAll, ParseError } from 'eudata-common'
import type { PLPKDCode, PLRegonEntity, PLRegonFullReport, RequestOptions } from './types.js'
import { assertValidNIP, formatKRS, formatREGON } from './utils.js'

const BIR_BASE = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRz662.svc'

export interface RegonAuthOptions extends RequestOptions {
  apiKey: string
  sessionId?: string
}

function soapEnvelope(body: string, action: string): { xml: string; action: string } {
  return {
    action,
    xml:
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">` +
      `<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">` +
      `<wsa:To>${BIR_BASE}</wsa:To>` +
      `<wsa:Action>${action}</wsa:Action>` +
      `</soap:Header><soap:Body>${body}</soap:Body></soap:Envelope>`,
  }
}

async function login(apiKey: string, opts?: RequestOptions): Promise<string> {
  const { xml, action } = soapEnvelope(
    `<ns:Zaloguj><ns:pKluczUzytkownika>${apiKey}</ns:pKluczUzytkownika></ns:Zaloguj>`,
    'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj'
  )
  const res = await fetchText(BIR_BASE, {
    ...(opts ?? {}),
    source: 'pl:regon',
    method: 'POST',
    body: xml,
    contentType: 'application/soap+xml; charset=utf-8',
    headers: { soapaction: action },
  })
  const session = xmlTagText(res, 'ZalogujResult')
  if (!session) throw new ParseError('REGON login failed', { source: 'pl:regon', body: res.slice(0, 500) })
  return session
}

async function search(
  param: 'Nip' | 'Krs' | 'Regon',
  value: string,
  authOpts: RegonAuthOptions
): Promise<PLRegonEntity> {
  const sessionId = authOpts.sessionId ?? (await login(authOpts.apiKey, authOpts))
  const { xml, action } = soapEnvelope(
    `<ns:DaneSzukajPodmioty><ns:pParametryWyszukiwania>` +
      `<dat:${param} xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">${value}</dat:${param}>` +
      `</ns:pParametryWyszukiwania></ns:DaneSzukajPodmioty>`,
    'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty'
  )
  const res = await fetchText(BIR_BASE, {
    ...authOpts,
    source: 'pl:regon',
    method: 'POST',
    body: xml,
    contentType: 'application/soap+xml; charset=utf-8',
    headers: { soapaction: action, sid: sessionId },
  })
  const inner = xmlTagText(res, 'DaneSzukajPodmiotyResult') ?? ''
  const decoded = inner
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  const regon = xmlTagText(decoded, 'Regon') ?? value
  return {
    regon,
    nip: xmlTagText(decoded, 'Nip') ?? '',
    name: xmlTagText(decoded, 'Nazwa') ?? '',
    province: xmlTagText(decoded, 'Wojewodztwo') ?? '',
    district: xmlTagText(decoded, 'Powiat') ?? '',
    commune: xmlTagText(decoded, 'Gmina') ?? '',
    city: xmlTagText(decoded, 'Miejscowosc') ?? '',
    postalCode: xmlTagText(decoded, 'KodPocztowy') ?? '',
    street: xmlTagText(decoded, 'Ulica') ?? '',
    houseNumber: xmlTagText(decoded, 'NrNieruchomosci') ?? '',
    type: mapType(xmlTagText(decoded, 'Typ')),
    pkdMain: pkdFromXml(decoded),
    registrationDate: xmlTagText(decoded, 'DataRozpoczeciaDzialalnosci') ?? '',
    status: mapStatus(xmlTagText(decoded, 'Status')),
  }
}

function mapType(t: string | null): PLRegonEntity['type'] {
  const lower = (t ?? '').toLowerCase()
  if (lower === 'p') return 'legal_person'
  if (lower === 'f') return 'natural_person'
  if (lower === 'lp' || lower === 'lf') return 'local_unit'
  return 'unknown'
}

function mapStatus(s: string | null): PLRegonEntity['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('akt')) return 'active'
  if (lower.includes('niea')) return 'inactive'
  return 'unknown'
}

function pkdFromXml(xml: string): PLPKDCode | null {
  const code = xmlTagText(xml, 'PrzewazajacePKD')
  if (!code) return null
  return { code, description: xmlTagText(xml, 'PrzewazajacePKDOpis') ?? '', primary: true }
}

export const regon = {
  async byNIP(nip: string, opts: RegonAuthOptions): Promise<PLRegonEntity> {
    const valid = assertValidNIP(nip)
    return search('Nip', valid, opts)
  },

  async byREGON(regonValue: string, opts: RegonAuthOptions): Promise<PLRegonEntity> {
    return search('Regon', formatREGON(regonValue), opts)
  },

  async byKRS(krs: string, opts: RegonAuthOptions): Promise<PLRegonEntity> {
    return search('Krs', formatKRS(krs), opts)
  },

  async fullReport(regonValue: string, opts: RegonAuthOptions): Promise<PLRegonFullReport> {
    const entity = await regon.byREGON(regonValue, opts)
    void xmlTagTextAll
    return {
      entity,
      branches: [],
      allPKDCodes: entity.pkdMain ? [entity.pkdMain] : [],
      employeeCountRange: '',
      legalForm: '',
      ownershipForm: '',
      foundingDate: entity.registrationDate,
    }
  },
}
