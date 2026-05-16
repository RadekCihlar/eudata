import { fetchJSON } from 'eudata-common'
import type {
  RequestOptions,
  SKCourtDecision,
  SKCourtDecisionDetail,
} from './types.js'
import { assertValidICO } from './utils.js'

const OS_BASE = 'https://api.otvorenesudy.sk'

interface OsRow {
  id?: string | number
  court?: string
  fileReference?: string
  date?: string
  type?: string
  summary?: string
  parties?: string[]
  textUrl?: string
}

export interface SKCourtSearchOptions extends RequestOptions {
  limit?: number
  court?: string
  fromDate?: string
  toDate?: string
}

function mapRow(r: OsRow): SKCourtDecision {
  return {
    id: String(r.id ?? ''),
    court: r.court ?? '',
    fileReference: r.fileReference ?? '',
    date: r.date ?? '',
    type: r.type ?? '',
    summary: r.summary ?? '',
    parties: r.parties ?? [],
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<SKCourtDecision[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ results?: OsRow[] }>(`${OS_BASE}/decisions?${qs}`, {
    ...(opts ?? {}),
    source: 'sk:otvorenesudy',
  })
  return (res.results ?? []).map(mapRow)
}

export const court = {
  async search(queryText: string, opts?: SKCourtSearchOptions): Promise<SKCourtDecision[]> {
    const params: Record<string, string> = { q: queryText, limit: String(opts?.limit ?? 50) }
    if (opts?.court) params['court'] = opts.court
    if (opts?.fromDate) params['from'] = opts.fromDate
    if (opts?.toDate) params['to'] = opts.toDate
    return query(params, opts)
  },

  async detail(decisionId: string, opts?: RequestOptions): Promise<SKCourtDecisionDetail | null> {
    try {
      const raw = await fetchJSON<OsRow>(`${OS_BASE}/decisions/${encodeURIComponent(decisionId)}`, {
        ...(opts ?? {}),
        source: 'sk:otvorenesudy',
      })
      return { ...mapRow(raw), textUrl: raw.textUrl ?? null }
    } catch {
      return null
    }
  },

  async byCompany(ico: string, opts?: RequestOptions): Promise<SKCourtDecision[]> {
    const valid = assertValidICO(ico)
    return query({ ico: valid }, opts)
  },
}
