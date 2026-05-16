import { fetchText } from 'eudata-common'
import { assertValidICO } from './utils.js'
import type {
  InsolvencyDetail,
  InsolvencyProceeding,
  InsolvencyResult,
  RequestOptions,
} from './types.js'

const ISIR_BASE = 'https://isir.justice.cz/isir/common/stat.do'

interface IsirRaw {
  pocetVysledku?: number
  vysledky?: IsirRawRow[]
}

interface IsirRawRow {
  idOsoby?: string | number
  druhRizeni?: string
  stavRizeni?: string
  datumZahajeni?: string
  spisovaZnacka?: string
}

function mapStatus(stav: string | undefined): InsolvencyProceeding['status'] {
  if (!stav) return 'unknown'
  const upper = stav.toUpperCase()
  if (upper.includes('PROBIHA') || upper === 'AKTIVNI') return 'active'
  if (upper.includes('PRAVOMOCNE') || upper.includes('SKONCEN')) return 'resolved'
  if (upper.includes('ZAMITNUT') || upper.includes('ODMITNUT')) return 'dismissed'
  return 'unknown'
}

function parseIsirBody(body: string): IsirRaw {
  const trimmed = body.trim()
  if (trimmed === '' || trimmed === 'null') return { pocetVysledku: 0, vysledky: [] }
  if (trimmed.startsWith('<')) return { pocetVysledku: 0, vysledky: [] }
  try {
    return JSON.parse(trimmed) as IsirRaw
  } catch {
    return { pocetVysledku: 0, vysledky: [] }
  }
}

function mapRow(row: IsirRawRow): InsolvencyProceeding {
  return {
    personId: String(row.idOsoby ?? ''),
    type: row.druhRizeni ?? '',
    status: mapStatus(row.stavRizeni),
    startDate: row.datumZahajeni ?? null,
    fileReference: row.spisovaZnacka ?? '',
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<IsirRaw> {
  const qs = new URLSearchParams(params).toString()
  const url = `${ISIR_BASE}?${qs}`
  const body = await fetchText(url, { ...(opts ?? {}), source: 'cz:isir' })
  return parseIsirBody(body)
}

export const insolvency = {
  async check(ico: string, opts?: RequestOptions): Promise<InsolvencyResult> {
    const valid = assertValidICO(ico)
    const raw = await query({ dotaz: valid }, opts)
    const proceedings = (raw.vysledky ?? []).map(mapRow)
    return {
      query: valid,
      count: raw.pocetVysledku ?? proceedings.length,
      proceedings,
      insolvent: proceedings.some((p) => p.status === 'active'),
    }
  },

  async checkPerson(
    name: string,
    birthDate?: string,
    opts?: RequestOptions
  ): Promise<InsolvencyResult> {
    const params: Record<string, string> = { jmeno: name }
    if (birthDate) params['datumNarozeni'] = birthDate
    const raw = await query(params, opts)
    const proceedings = (raw.vysledky ?? []).map(mapRow)
    return {
      query: name,
      count: raw.pocetVysledku ?? proceedings.length,
      proceedings,
      insolvent: proceedings.some((p) => p.status === 'active'),
    }
  },

  async detail(fileReference: string, opts?: RequestOptions): Promise<InsolvencyDetail> {
    const raw = await query({ spisovaZnacka: fileReference }, opts)
    const row = raw.vysledky?.[0]
    const base: InsolvencyProceeding = row
      ? mapRow(row)
      : {
          personId: '',
          type: '',
          status: 'unknown',
          startDate: null,
          fileReference,
        }
    return { ...base, events: [] }
  },
}
