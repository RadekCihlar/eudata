import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const SG_BASE = 'https://ec.europa.eu/safety-gate-alerts/public/api/notifications'

export interface SafetyGateAlert {
  alertNumber: string
  publicationDate: string
  productCategory: string | null
  productName: string | null
  brand: string | null
  riskType: string | null
  countryOfOrigin: string | null
  notifyingCountry: string | null
  measures: string[]
  url: string | null
}

export interface SafetyGateSearchOptions extends RequestOptions {
  query?: string
  limit?: number
  page?: number
  language?: string
}

interface SgRawAlert {
  reference?: string
  publicationDate?: string
  category?: { name?: string } | string
  productName?: string
  brand?: string
  risk?: { type?: string } | string
  countryOfOrigin?: string | { code?: string; name?: string }
  notifyingCountry?: string | { code?: string; name?: string }
  measures?: Array<{ description?: string } | string>
  detailsUrl?: string
}

interface SgResponse {
  notifications?: SgRawAlert[]
  totalElements?: number
  totalCount?: number
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const o = v as { name?: string; code?: string }
    return o.name ?? o.code ?? null
  }
  return null
}

function mapAlert(a: SgRawAlert): SafetyGateAlert {
  return {
    alertNumber: a.reference ?? '',
    publicationDate: a.publicationDate ?? '',
    productCategory: asString(a.category),
    productName: a.productName ?? null,
    brand: a.brand ?? null,
    riskType: asString(a.risk),
    countryOfOrigin: asString(a.countryOfOrigin),
    notifyingCountry: asString(a.notifyingCountry),
    measures: (a.measures ?? []).map((m) => (typeof m === 'string' ? m : (m.description ?? ''))).filter(Boolean),
    url: a.detailsUrl ?? null,
  }
}

export const safetyGate = {
  async search(opts: SafetyGateSearchOptions = {}): Promise<{ alerts: SafetyGateAlert[]; total: number }> {
    const params = new URLSearchParams()
    if (opts.query) params.set('q', opts.query)
    params.set('size', String(opts.limit ?? 20))
    params.set('page', String((opts.page ?? 1) - 1))
    params.set('language', opts.language ?? 'EN')

    const url = `${SG_BASE}?${params.toString()}`
    const res = await fetchJSON<SgResponse>(url, { ...opts, source: 'eu:safety-gate' })
    return {
      alerts: (res.notifications ?? []).map(mapAlert),
      total: res.totalElements ?? res.totalCount ?? 0,
    }
  },

  async byQuery(query: string, opts?: Omit<SafetyGateSearchOptions, 'query'>): Promise<{ alerts: SafetyGateAlert[]; total: number }> {
    return safetyGate.search({ ...opts, query })
  },
}
