import { fetchJSON } from 'eudata-common'
import { czFetchJSON } from './http.js'
import type {
  CompanyInfo,
  RequestOptions,
  SearchOptions,
  LegalForm,
} from './types.js'
import {
  assertValidICO,
  decodeLegalForm,
  formatICO,
  normalizeAddress,
  type AresAddressRaw,
} from './utils.js'

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty'
const ARES_SEARCH = `${ARES_BASE}/vyhledat`

interface AresEntity {
  ico?: string | number
  obchodniJmeno?: string
  sidlo?: AresAddressRaw
  pravniForma?: string
  datumVzniku?: string
  datumZaniku?: string | null
  dic?: string | null
  czNace?: string[]
  seznamRegistraci?: Record<string, string>
}

interface AresSearchResponse {
  pocetCelkem: number
  ekonomickeSubjekty?: AresEntity[]
}

function mapEntity(raw: AresEntity): CompanyInfo {
  const ico = formatICO(String(raw.ico ?? ''))
  const legalFormCode = raw.pravniForma ?? null
  const legalForm: LegalForm = decodeLegalForm(legalFormCode)
  const registrations = raw.seznamRegistraci ?? {}
  const active = computeActive(raw, registrations)
  return {
    ico,
    name: (raw.obchodniJmeno ?? '').trim(),
    address: normalizeAddress(raw.sidlo),
    legalForm,
    legalFormCode,
    founded: raw.datumVzniku ?? null,
    dissolved: raw.datumZaniku ?? null,
    active,
    vatId: raw.dic ?? null,
    naceCodes: Array.isArray(raw.czNace) ? raw.czNace : [],
    registrations,
    _raw: raw,
  }
}

function computeActive(raw: AresEntity, registrations: Record<string, string>): boolean {
  if (raw.datumZaniku) return false
  const ros = registrations['stavZdrojeRos']
  if (ros) return ros.toUpperCase() === 'AKTIVNI'
  return true
}

export const company = {
  async lookup(ico: string, opts?: RequestOptions): Promise<CompanyInfo> {
    const valid = assertValidICO(ico)
    const raw = await czFetchJSON<AresEntity>(`${ARES_BASE}/${valid}`, 'ares', opts)
    return mapEntity(raw)
  },

  async search(name: string, opts?: SearchOptions): Promise<CompanyInfo[]> {
    const limit = Math.min(opts?.limit ?? 10, 100)
    const body = {
      obchodniJmeno: name,
      pocet: limit,
      ...(opts?.activeOnly ? { stavZdrojeRos: 'AKTIVNI' } : {}),
      ...(opts?.region ? { sidloKodKraje: opts.region } : {}),
    }
    const res = await fetchJSON<AresSearchResponse>(ARES_SEARCH, {
      ...(opts ?? {}),
      source: 'cz:ares',
      method: 'POST',
      body: JSON.stringify(body),
      contentType: 'application/json',
    })
    const list = res.ekonomickeSubjekty ?? []
    return list.map(mapEntity)
  },

  async raw(ico: string, opts?: RequestOptions): Promise<unknown> {
    const valid = assertValidICO(ico)
    return czFetchJSON<unknown>(`${ARES_BASE}/${valid}`, 'ares', opts)
  },
}
