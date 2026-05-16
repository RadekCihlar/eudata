import { fetchText, NotFoundError } from 'eudata-common'
import type { ExecutionProceeding, ExecutionResult, RequestOptions } from './types.js'
import { assertValidICO } from './utils.js'

const CEECR_SEARCH = 'https://www.ceecr.cz/search'

function parseRows(html: string): ExecutionProceeding[] {
  const rows: ExecutionProceeding[] = []
  const trMatches = html.match(/<tr[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  for (const tr of trMatches) {
    const cells = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? []).map((c) =>
      c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    )
    if (cells.length === 0) continue
    rows.push({
      executor: cells[0] ?? '',
      fileReference: cells[1] ?? '',
      startDate: cells[2] ?? null,
      status: (cells[3] ?? '').toLowerCase().includes('aktivn') ? 'active' : 'unknown',
      court: cells[4] ?? null,
    })
  }
  return rows
}

async function queryCEECR(params: Record<string, string>, opts?: RequestOptions): Promise<ExecutionResult> {
  const qs = new URLSearchParams(params).toString()
  let html: string
  try {
    html = await fetchText(`${CEECR_SEARCH}?${qs}`, { ...(opts ?? {}), source: 'cz:ceecr' })
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { query: params['q'] ?? '', hasActiveExecutions: false, count: 0, proceedings: [] }
    }
    throw e
  }
  const proceedings = parseRows(html)
  return {
    query: params['q'] ?? '',
    hasActiveExecutions: proceedings.some((p) => p.status === 'active'),
    count: proceedings.length,
    proceedings,
  }
}

export const execution = {
  async checkCompany(ico: string, opts?: RequestOptions): Promise<ExecutionResult> {
    const valid = assertValidICO(ico)
    return queryCEECR({ q: valid, type: 'ico' }, opts)
  },

  async checkPerson(name: string, birthDate: string, opts?: RequestOptions): Promise<ExecutionResult> {
    return queryCEECR({ q: name, birthDate, type: 'person' }, opts)
  },
}
