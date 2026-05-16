import { fetchJSON } from 'eudata-common'
import type {
  RequestOptions,
  SKInsolvencyDetail,
  SKInsolvencyProceeding,
  SKInsolvencyResult,
} from './types.js'
import { assertValidICO } from './utils.js'

const RU_BASE = 'https://ru.justice.sk/ru-verejnost-web/api'

interface RuRow {
  sud?: string
  spisovaZnacka?: string
  druhKonania?: string
  stavKonania?: string
  datumZacatia?: string
  spravca?: string
  meno?: string
}

interface RuResponse {
  results?: RuRow[]
  count?: number
}

function mapType(s: string | undefined): SKInsolvencyProceeding['type'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('konkurz') && lower.includes('malý')) return 'small_bankruptcy'
  if (lower.includes('konkurz')) return 'bankruptcy'
  if (lower.includes('reštrukt')) return 'restructuring'
  if (lower.includes('oddlž')) return 'debt_discharge'
  if (lower.includes('likvid')) return 'liquidation'
  return 'unknown'
}

function mapStatus(s: string | undefined): SKInsolvencyProceeding['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('prebieh') || lower.includes('aktiv')) return 'active'
  if (lower.includes('skonč') || lower.includes('uzavre')) return 'resolved'
  if (lower.includes('zamiet')) return 'dismissed'
  return 'unknown'
}

function mapRow(r: RuRow): SKInsolvencyProceeding {
  return {
    court: r.sud ?? '',
    fileReference: r.spisovaZnacka ?? '',
    type: mapType(r.druhKonania),
    status: mapStatus(r.stavKonania),
    startDate: r.datumZacatia ?? null,
    administrator: r.spravca ?? null,
    debtorName: r.meno ?? '',
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<RuResponse> {
  const qs = new URLSearchParams(params).toString()
  return fetchJSON<RuResponse>(`${RU_BASE}/search?${qs}`, {
    ...(opts ?? {}),
    source: 'sk:ru',
  })
}

export const insolvency = {
  async check(ico: string, opts?: RequestOptions): Promise<SKInsolvencyResult> {
    const valid = assertValidICO(ico)
    const raw = await query({ ico: valid }, opts)
    const proceedings = (raw.results ?? []).map(mapRow)
    return {
      ico: valid,
      insolvent: proceedings.some((p) => p.status === 'active'),
      count: raw.count ?? proceedings.length,
      proceedings,
    }
  },

  async checkPerson(name: string, opts?: RequestOptions): Promise<SKInsolvencyResult> {
    const raw = await query({ meno: name }, opts)
    const proceedings = (raw.results ?? []).map(mapRow)
    return {
      ico: '',
      insolvent: proceedings.some((p) => p.status === 'active'),
      count: raw.count ?? proceedings.length,
      proceedings,
    }
  },

  async detail(fileReference: string, opts?: RequestOptions): Promise<SKInsolvencyDetail> {
    const raw = await query({ spisovaZnacka: fileReference }, opts)
    const row = raw.results?.[0]
    const base = row
      ? mapRow(row)
      : {
          court: '',
          fileReference,
          type: 'unknown' as const,
          status: 'unknown' as const,
          startDate: null,
          administrator: null,
          debtorName: '',
        }
    return { ...base, events: [] }
  },
}
