import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKTender } from './types.js'
import { assertValidICO } from './utils.js'

const UVO_BASE = 'https://www.uvo.gov.sk/api/v1'

interface UvoTenderRow {
  id?: string
  nazov?: string
  obstaravatelNazov?: string
  obstaravatelIco?: string
  predpokladanaHodnota?: number
  mena?: string
  datumZverejnenia?: string
  lehotaNaPodanie?: string
  stav?: string
  kodyCPV?: string[]
  vitazNazov?: string
  vitazIco?: string
  vitazHodnota?: number
}

function mapStatus(s: string | undefined): SKTender['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('otvor') || lower.includes('open')) return 'open'
  if (lower.includes('uzav') || lower.includes('closed')) return 'closed'
  if (lower.includes('zadan') || lower.includes('awarded')) return 'awarded'
  if (lower.includes('zrus') || lower.includes('cancel')) return 'cancelled'
  return 'unknown'
}

function mapTender(t: UvoTenderRow): SKTender {
  const tender: SKTender = {
    id: t.id ?? '',
    title: t.nazov ?? '',
    authority: { name: t.obstaravatelNazov ?? '', ico: t.obstaravatelIco ?? '' },
    estimatedValue: t.predpokladanaHodnota ?? null,
    currency: t.mena ?? 'EUR',
    publishDate: t.datumZverejnenia ?? '',
    deadline: t.lehotaNaPodanie ?? null,
    status: mapStatus(t.stav),
    cpvCodes: t.kodyCPV ?? [],
  }
  if (t.vitazIco || t.vitazNazov) {
    tender.winner = {
      name: t.vitazNazov ?? '',
      ico: t.vitazIco ?? '',
      awardedValue: t.vitazHodnota ?? 0,
    }
  }
  return tender
}

export interface SKTenderSearchOptions extends RequestOptions {
  limit?: number
  status?: 'open' | 'closed' | 'awarded'
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<SKTender[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ tenders?: UvoTenderRow[] }>(`${UVO_BASE}/tenders?${qs}`, {
    ...(opts ?? {}),
    source: 'sk:uvo',
  })
  return (res.tenders ?? []).map(mapTender)
}

export const tenders = {
  async search(queryText: string, opts?: SKTenderSearchOptions): Promise<SKTender[]> {
    const params: Record<string, string> = { q: queryText, limit: String(opts?.limit ?? 50) }
    if (opts?.status) params['status'] = opts.status
    return query(params, opts)
  },

  async wonBy(ico: string, opts?: RequestOptions): Promise<SKTender[]> {
    const valid = assertValidICO(ico)
    return query({ winnerIco: valid }, opts)
  },

  async issuedBy(ico: string, opts?: RequestOptions): Promise<SKTender[]> {
    const valid = assertValidICO(ico)
    return query({ authorityIco: valid }, opts)
  },
}
