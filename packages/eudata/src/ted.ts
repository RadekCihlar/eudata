import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const TED_BASE = 'https://api.ted.europa.eu/v3'

const COUNTRY_ALPHA3: Record<string, string> = {
  CZ: 'CZE',
  SK: 'SVK',
  PL: 'POL',
  DE: 'DEU',
  AT: 'AUT',
  FR: 'FRA',
  IT: 'ITA',
  ES: 'ESP',
  NL: 'NLD',
  BE: 'BEL',
  HU: 'HUN',
  SI: 'SVN',
  RO: 'ROU',
  BG: 'BGR',
  HR: 'HRV',
  IE: 'IRL',
  DK: 'DNK',
  SE: 'SWE',
  FI: 'FIN',
  EE: 'EST',
  LV: 'LVA',
  LT: 'LTU',
  GR: 'GRC',
  CY: 'CYP',
  MT: 'MLT',
  LU: 'LUX',
  PT: 'PRT',
}

export interface TedNotice {
  publicationNumber: string
  pdfUrls: Record<string, string>
  xmlUrl: string | null
}

export interface TedSearchOptions extends RequestOptions {
  country?: string
  limit?: number
  page?: number
  query?: string
}

interface TedRawNotice {
  'publication-number'?: string
  links?: {
    pdf?: Record<string, string>
    xml?: { MUL?: string }
  }
}

interface TedResponse {
  notices?: TedRawNotice[]
  totalNoticeCount?: number
}

function buildQuery(opts: TedSearchOptions): string {
  const parts: string[] = []
  if (opts.country) {
    const alpha3 = COUNTRY_ALPHA3[opts.country.toUpperCase()] ?? opts.country.toUpperCase()
    parts.push(`buyer-country="${alpha3}"`)
  }
  if (opts.query) parts.push(opts.query)
  return parts.join(' AND ') || '*'
}

function mapNotice(n: TedRawNotice): TedNotice {
  return {
    publicationNumber: n['publication-number'] ?? '',
    pdfUrls: n.links?.pdf ?? {},
    xmlUrl: n.links?.xml?.MUL ?? null,
  }
}

export const tenders = {
  async search(opts: TedSearchOptions = {}): Promise<{ notices: TedNotice[]; total: number }> {
    const body = {
      query: buildQuery(opts),
      limit: opts.limit ?? 10,
      page: opts.page ?? 1,
      fields: ['organisation-country-buyer'],
    }
    const res = await fetchJSON<TedResponse>(`${TED_BASE}/notices/search`, {
      ...opts,
      source: 'eu:ted',
      method: 'POST',
      body: JSON.stringify(body),
      contentType: 'application/json',
    })
    return {
      notices: (res.notices ?? []).map(mapNotice),
      total: res.totalNoticeCount ?? 0,
    }
  },

  async byCountry(country: string, opts?: Omit<TedSearchOptions, 'country'>): Promise<{ notices: TedNotice[]; total: number }> {
    return tenders.search({ ...opts, country })
  },
}
