import { fetchJSON } from 'eudata-common'
import type {
  PLInsolvencyProceeding,
  PLInsolvencyResult,
  RequestOptions,
} from './types.js'
import { assertValidNIP, formatKRS } from './utils.js'

const KRZ_BASE = 'https://krz.ms.gov.pl/api/v1'

interface KrzRow {
  sad?: string
  sygnaturaAkt?: string
  typPostepowania?: string
  status?: string
  dataOtwarcia?: string
  syndyk?: string
}

function mapType(t: string | undefined): PLInsolvencyProceeding['type'] {
  const lower = (t ?? '').toLowerCase()
  if (lower.includes('upadl') && lower.includes('konsum')) return 'consumer_bankruptcy'
  if (lower.includes('upadl')) return 'bankruptcy'
  if (lower.includes('restruk')) return 'restructuring'
  if (lower.includes('egzek')) return 'enforcement'
  return 'unknown'
}

function mapStatus(s: string | undefined): PLInsolvencyProceeding['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('aktyw') || lower.includes('w toku')) return 'active'
  if (lower.includes('zakon') || lower.includes('zamkn')) return 'completed'
  if (lower.includes('odd')) return 'dismissed'
  return 'unknown'
}

function mapRow(r: KrzRow): PLInsolvencyProceeding {
  return {
    court: r.sad ?? '',
    fileReference: r.sygnaturaAkt ?? '',
    type: mapType(r.typPostepowania),
    status: mapStatus(r.status),
    startDate: r.dataOtwarcia ?? '',
    administrator: r.syndyk ?? null,
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<PLInsolvencyResult> {
  const qs = new URLSearchParams(params).toString()
  interface Response {
    proceedings?: KrzRow[]
    count?: number
  }
  const res = await fetchJSON<Response>(`${KRZ_BASE}/search?${qs}`, {
    ...(opts ?? {}),
    source: 'pl:krz',
  })
  const proceedings = (res.proceedings ?? []).map(mapRow)
  return {
    query: Object.values(params)[0] ?? '',
    insolvent: proceedings.some((p) => p.status === 'active'),
    count: res.count ?? proceedings.length,
    proceedings,
  }
}

export const insolvency = {
  async check(nip: string, opts?: RequestOptions): Promise<PLInsolvencyResult> {
    const valid = assertValidNIP(nip)
    return query({ nip: valid }, opts)
  },

  async checkPerson(pesel: string, opts?: RequestOptions): Promise<PLInsolvencyResult> {
    return query({ pesel }, opts)
  },

  async checkByKRS(krs: string, opts?: RequestOptions): Promise<PLInsolvencyResult> {
    return query({ krs: formatKRS(krs) }, opts)
  },
}
