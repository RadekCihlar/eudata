import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const TR_BASE = 'https://ec.europa.eu/transparencyregister/public/api/v1'

export interface LobbyEntity {
  id: string
  name: string
  acronym: string | null
  category: string | null
  headOffice: string | null
  country: string | null
  website: string | null
  registrationDate: string | null
  members: number | null
  fteEquivalent: number | null
  budget: number | null
  url: string
}

export interface LobbySearchOptions extends RequestOptions {
  query?: string
  country?: string
  category?: string
  limit?: number
}

interface TrResponse {
  results?: TrEntity[]
  totalCount?: number
}

interface TrEntity {
  identificationCode?: string
  organisationName?: string
  acronym?: string
  category?: string
  countryHeadOffice?: string
  headOfficeCity?: string
  websiteUrl?: string
  registrationDate?: string
  members?: number
  fteEquivalent?: number | string
  closedFiscalYearBudget?: number | string
}

function num(v: number | string | undefined): number | null {
  if (v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapEntity(e: TrEntity): LobbyEntity {
  const id = e.identificationCode ?? ''
  return {
    id,
    name: e.organisationName ?? '',
    acronym: e.acronym ?? null,
    category: e.category ?? null,
    headOffice: e.headOfficeCity ?? null,
    country: e.countryHeadOffice ?? null,
    website: e.websiteUrl ?? null,
    registrationDate: e.registrationDate ?? null,
    members: num(e.members),
    fteEquivalent: num(e.fteEquivalent),
    budget: num(e.closedFiscalYearBudget),
    url: `https://ec.europa.eu/transparencyregister/public/consultation/displaylobbyist.do?id=${encodeURIComponent(id)}`,
  }
}

export const lobby = {
  async search(opts: LobbySearchOptions = {}): Promise<{ entities: LobbyEntity[]; total: number }> {
    const params = new URLSearchParams({ pageSize: String(opts.limit ?? 20) })
    if (opts.query) params.set('searchText', opts.query)
    if (opts.country) params.set('country', opts.country.toUpperCase())
    if (opts.category) params.set('category', opts.category)
    const url = `${TR_BASE}/search?${params.toString()}`
    const res = await fetchJSON<TrResponse>(url, { ...opts, source: 'eu:lobby' })
    return {
      entities: (res.results ?? []).map(mapEntity),
      total: res.totalCount ?? 0,
    }
  },
}
