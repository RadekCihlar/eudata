import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const MSIG_BASE = 'https://ems.ms.gov.pl/api/msig'

export interface PLCourtDecision {
  id: string
  court: string
  fileReference: string
  date: string
  type: string
  summary: string
}

interface MsigRow {
  id?: string
  sad?: string
  sygnatura?: string
  data?: string
  typ?: string
  tresc?: string
}

function mapRow(r: MsigRow): PLCourtDecision {
  return {
    id: r.id ?? '',
    court: r.sad ?? '',
    fileReference: r.sygnatura ?? '',
    date: r.data ?? '',
    type: r.typ ?? '',
    summary: r.tresc ?? '',
  }
}

export interface PLCourtSearchOptions extends RequestOptions {
  limit?: number
  fromDate?: string
  toDate?: string
}

export const court = {
  async search(query: string, opts?: PLCourtSearchOptions): Promise<PLCourtDecision[]> {
    const params = new URLSearchParams({ q: query, limit: String(opts?.limit ?? 50) })
    if (opts?.fromDate) params.set('from', opts.fromDate)
    if (opts?.toDate) params.set('to', opts.toDate)
    const res = await fetchJSON<{ results?: MsigRow[] }>(`${MSIG_BASE}/search?${params}`, {
      ...(opts ?? {}),
      source: 'pl:msig',
    })
    return (res.results ?? []).map(mapRow)
  },
}
