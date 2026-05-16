import { fetchJSON, xmlTagText, xmlTagTextAll, encodeXmlEntities } from 'eudata-common'
import { czFetchSoap } from './http.js'
import type { BankAccount, RequestOptions, UnreliableEntry, VatInfo } from './types.js'
import { assertValidICO, normalizeDIC, validateDIC } from './utils.js'

const SOAP_URL = 'https://adisws.mfcr.cz/adistc/axis2/services/rozhraniCRPDPH'
const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty'

function toDIC(input: string): string {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  if (cleaned.startsWith('CZ')) {
    if (!validateDIC(cleaned)) {
      const ico = cleaned.slice(2)
      return `CZ${assertValidICO(ico)}`
    }
    return cleaned
  }
  return `CZ${assertValidICO(cleaned)}`
}

function buildStatusEnvelope(dic: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">` +
    `<soapenv:Body><roz:StatusNespolehlivyPlatceRequest dic="${encodeXmlEntities(dic)}"/></soapenv:Body>` +
    `</soapenv:Envelope>`
  )
}

function parseStatusResponse(xml: string, dic: string): VatInfo {
  const status = xmlTagText(xml, 'statusPlatceDPH') ?? xmlTagText(xml, 'status')
  const unreliable = xmlTagText(xml, 'nespolehlivyPlatce')
  const since = xmlTagText(xml, 'datumZverejneninespolehlivosti') ?? xmlTagText(xml, 'datumZverejneni')
  const accounts = parseBankAccounts(xml)
  const vatPayer = !!status && status.toUpperCase() !== 'NEPLATCE'
  return {
    query: dic,
    ico: null,
    dic,
    vatPayer,
    registeredSince: null,
    unreliable: unreliable === 'ANO' || unreliable === 'NESPOLEHLIVY',
    unreliableSince: since,
    bankAccounts: accounts,
  }
}

function parseBankAccounts(xml: string): BankAccount[] {
  const blocks = xmlTagTextAll(xml, 'ucet')
  return blocks.map((block) => ({
    iban: xmlTagText(block, 'standardizovanyUcet') ?? null,
    accountNumber: xmlTagText(block, 'cisloUctu') ?? '',
    bankCode: xmlTagText(block, 'kodBanky') ?? '',
    publishedAt: xmlTagText(block, 'datumZverejneniUctu'),
  }))
}

interface AresVatBlob {
  ico?: string | number
  dic?: string | null
  seznamRegistraci?: Record<string, string>
}

async function aresVatFallback(ico: string, opts: RequestOptions | undefined): Promise<VatInfo> {
  const raw = await fetchJSON<AresVatBlob>(`${ARES_BASE}/${ico}`, {
    ...(opts ?? {}),
    source: 'cz:ares',
  })
  const dphStatus = raw.seznamRegistraci?.['stavZdrojeDph']
  return {
    query: ico,
    ico,
    dic: raw.dic ?? null,
    vatPayer: dphStatus?.toUpperCase() === 'AKTIVNI',
    registeredSince: null,
    unreliable: false,
    unreliableSince: null,
    bankAccounts: [],
  }
}

export const vat = {
  async check(icoOrDic: string, opts?: RequestOptions): Promise<VatInfo> {
    let dic: string
    try {
      dic = toDIC(icoOrDic)
    } catch (e) {
      throw e
    }
    try {
      const xml = await czFetchSoap(SOAP_URL, 'vat-crpdph', buildStatusEnvelope(dic), opts)
      const info = parseStatusResponse(xml, dic)
      info.ico = dic.replace(/^CZ/, '').padStart(8, '0').slice(-8)
      return info
    } catch {
      const ico = dic.replace(/^CZ/, '').padStart(8, '0').slice(-8)
      return aresVatFallback(ico, opts)
    }
  },

  async isUnreliable(icoOrDic: string, opts?: RequestOptions): Promise<boolean> {
    const info = await vat.check(icoOrDic, opts)
    return info.unreliable
  },

  async bankAccounts(icoOrDic: string, opts?: RequestOptions): Promise<BankAccount[]> {
    const info = await vat.check(icoOrDic, opts)
    return info.bankAccounts
  },

  async downloadUnreliableList(opts?: RequestOptions): Promise<UnreliableEntry[]> {
    const body =
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">` +
      `<soapenv:Body><roz:SeznamNespolehlivyPlatceRequest/></soapenv:Body>` +
      `</soapenv:Envelope>`
    const xml = await czFetchSoap(SOAP_URL, 'vat-crpdph', body, opts)
    const blocks = xmlTagTextAll(xml, 'statusPlatceDPH')
    return blocks.map((block) => ({
      dic: xmlTagText(block, 'dic') ?? '',
      unreliableSince: xmlTagText(block, 'datumZverejneninespolehlivosti') ?? '',
      reason: xmlTagText(block, 'duvod'),
    }))
  },
}

export { normalizeDIC }
