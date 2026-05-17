import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const FT_SEARCH = 'https://api.tech.ec.europa.eu/search-api/prod/rest/search'
const FT_PORTAL = 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details'

export interface FundingTopic {
  id: string
  identifier: string | null
  title: string | null
  programme: string | null
  callIdentifier: string | null
  status: string | null
  openingDate: string | null
  deadline: string | null
  budget: number | null
  url: string
}

export interface FundingSearchOptions extends RequestOptions {
  query?: string
  programme?: string
  status?: 'Open' | 'Forthcoming' | 'Closed'
  limit?: number
  page?: number
}

interface FtResponse {
  totalResults?: number
  results?: FtRawResult[]
}

interface FtRawResult {
  reference?: string
  metadata?: Record<string, string[] | string | undefined>
  content?: string
}

function meta(r: FtRawResult, key: string): string | null {
  const v = r.metadata?.[key]
  if (Array.isArray(v)) return v[0] ?? null
  if (typeof v === 'string') return v
  return null
}

function toNumber(v: string | null): number | null {
  if (!v) return null
  const cleaned = v.replace(/[^0-9.,]/g, '').replace(/,/g, '')
  const n = Number(cleaned.split('.').slice(0, 2).join('.'))
  if (!Number.isFinite(n) || n < 0 || n > 1e12) return null
  return n
}

function mapTopic(r: FtRawResult): FundingTopic {
  const identifier = meta(r, 'identifier') ?? r.reference ?? ''
  return {
    id: r.reference ?? identifier,
    identifier,
    title: meta(r, 'title'),
    programme: meta(r, 'frameworkProgramme') ?? meta(r, 'programmeDivision'),
    callIdentifier: meta(r, 'callIdentifier'),
    status: meta(r, 'status'),
    openingDate: meta(r, 'startDate'),
    deadline: meta(r, 'deadlineDate'),
    budget: toNumber(meta(r, 'budgetOverview')),
    url: `${FT_PORTAL}/${encodeURIComponent(identifier)}`,
  }
}

export const fundingTenders = {
  async search(opts: FundingSearchOptions = {}): Promise<{ topics: FundingTopic[]; total: number }> {
    const params = new URLSearchParams({
      apiKey: 'SEDIA',
      text: opts.query ?? '***',
      pageSize: String(opts.limit ?? 20),
      pageNumber: String(opts.page ?? 1),
    })
    const filters: string[] = []
    if (opts.programme) filters.push(`frameworkProgramme/${opts.programme}`)
    if (opts.status) filters.push(`status/${opts.status}`)
    if (filters.length) params.set('languages', 'en')

    const body = JSON.stringify({
      bool: filters.length
        ? { must: filters.map((f) => ({ terms: { [f.split('/')[0]!]: [f.split('/')[1]!] } })) }
        : undefined,
    })

    const url = `${FT_SEARCH}?${params.toString()}`
    const res = await fetchJSON<FtResponse>(url, {
      ...opts,
      source: 'eu:funding-tenders',
      method: 'POST',
      body,
      contentType: 'application/json',
    })

    return {
      topics: (res.results ?? []).map(mapTopic),
      total: res.totalResults ?? 0,
    }
  },

  async byKeyword(query: string, opts?: Omit<FundingSearchOptions, 'query'>): Promise<{ topics: FundingTopic[]; total: number }> {
    return fundingTenders.search({ ...opts, query })
  },
}
