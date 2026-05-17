import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const OS_BASE = 'https://api.opensanctions.org'

export interface OpenSanctionsHit {
  id: string
  name: string
  schema: string
  countries: string[]
  topics: string[]
  datasets: string[]
  firstSeen: string | null
  lastSeen: string | null
  aliases: string[]
  score: number
  url: string
}

export interface OpenSanctionsSearchOptions extends RequestOptions {
  query: string
  dataset?: string
  schema?: 'Person' | 'Organization' | 'Company' | 'LegalEntity' | 'Thing'
  limit?: number
}

interface OsResponse {
  results?: Array<{
    id?: string
    caption?: string
    schema?: string
    score?: number
    first_seen?: string
    last_seen?: string
    properties?: {
      name?: string[]
      alias?: string[]
      country?: string[]
      topics?: string[]
    }
    datasets?: string[]
  }>
  total?: { value?: number }
}

export const opensanctions = {
  async search(opts: OpenSanctionsSearchOptions): Promise<{ hits: OpenSanctionsHit[]; total: number }> {
    const dataset = opts.dataset ?? 'default'
    const params = new URLSearchParams({ q: opts.query, limit: String(opts.limit ?? 10) })
    if (opts.schema) params.set('schema', opts.schema)
    const url = `${OS_BASE}/search/${encodeURIComponent(dataset)}?${params.toString()}`
    const res = await fetchJSON<OsResponse>(url, { ...opts, source: 'eu:opensanctions' })
    return {
      hits: (res.results ?? []).map((r) => ({
        id: r.id ?? '',
        name: r.caption ?? (r.properties?.name?.[0] ?? ''),
        schema: r.schema ?? '',
        countries: r.properties?.country ?? [],
        topics: r.properties?.topics ?? [],
        datasets: r.datasets ?? [],
        firstSeen: r.first_seen ?? null,
        lastSeen: r.last_seen ?? null,
        aliases: r.properties?.alias ?? [],
        score: r.score ?? 0,
        url: r.id ? `https://www.opensanctions.org/entities/${r.id}/` : '',
      })),
      total: res.total?.value ?? 0,
    }
  },

  async pep(query: string, opts?: Omit<OpenSanctionsSearchOptions, 'query' | 'dataset'>): Promise<{ hits: OpenSanctionsHit[]; total: number }> {
    return opensanctions.search({ ...opts, query, dataset: 'peps' })
  },

  async sanctioned(query: string, opts?: Omit<OpenSanctionsSearchOptions, 'query' | 'dataset'>): Promise<{ hits: OpenSanctionsHit[]; total: number }> {
    return opensanctions.search({ ...opts, query, dataset: 'sanctions' })
  },
}
