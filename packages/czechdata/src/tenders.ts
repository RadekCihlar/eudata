import { fetchJSON } from 'eudata-common'
import type {
  RequestOptions,
  Tender,
  TenderAnomaly,
  TenderSearchOptions,
} from './types.js'
import { assertValidICO } from './utils.js'

const NIPEZ_BASE = 'https://portal.nipez.cz/api'

interface NipezTenderRaw {
  id?: string
  nazev?: string
  zadavatelNazev?: string
  zadavatelIco?: string
  predpokladanaHodnota?: number
  mena?: string
  datumZverejneni?: string
  lhutaProPodani?: string
  stav?: string
  kodyCPV?: string[]
  vyhercaNazev?: string
  vyhercaIco?: string
  vyhercaHodnota?: number
}

interface NipezResponse {
  data?: NipezTenderRaw[]
}

function mapStatus(s: string | undefined): Tender['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('zad') || lower.includes('open')) return 'open'
  if (lower.includes('uzav') || lower.includes('closed')) return 'closed'
  if (lower.includes('zadan') || lower.includes('awarded')) return 'awarded'
  if (lower.includes('zrus') || lower.includes('cancel')) return 'cancelled'
  return 'unknown'
}

function mapTender(t: NipezTenderRaw): Tender {
  const tender: Tender = {
    id: t.id ?? '',
    title: t.nazev ?? '',
    contractingAuthority: { name: t.zadavatelNazev ?? '', ico: t.zadavatelIco ?? '' },
    estimatedValue: t.predpokladanaHodnota ?? null,
    currency: t.mena ?? 'CZK',
    publishDate: t.datumZverejneni ?? '',
    deadline: t.lhutaProPodani ?? null,
    status: mapStatus(t.stav),
    cpvCodes: t.kodyCPV ?? [],
  }
  if (t.vyhercaNazev || t.vyhercaIco) {
    tender.winner = {
      name: t.vyhercaNazev ?? '',
      ico: t.vyhercaIco ?? '',
      awardedValue: t.vyhercaHodnota ?? 0,
    }
  }
  return tender
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<Tender[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<NipezResponse>(`${NIPEZ_BASE}/tenders?${qs}`, {
    ...(opts ?? {}),
    source: 'cz:nipez',
  })
  return (res.data ?? []).map(mapTender)
}

export const tenders = {
  async search(queryText: string, opts?: TenderSearchOptions): Promise<Tender[]> {
    const params: Record<string, string> = { q: queryText, limit: String(opts?.limit ?? 50) }
    if (opts?.status) params['status'] = opts.status
    if (opts?.cpvCode) params['cpvCode'] = opts.cpvCode
    if (opts?.dateFrom) params['from'] = opts.dateFrom
    if (opts?.dateTo) params['to'] = opts.dateTo
    return query(params, opts)
  },

  async detail(tenderId: string, opts?: RequestOptions): Promise<Tender | null> {
    try {
      const raw = await fetchJSON<NipezTenderRaw>(`${NIPEZ_BASE}/tenders/${encodeURIComponent(tenderId)}`, {
        ...(opts ?? {}),
        source: 'cz:nipez',
      })
      return mapTender(raw)
    } catch {
      return null
    }
  },

  async wonBy(ico: string, opts?: RequestOptions): Promise<Tender[]> {
    const valid = assertValidICO(ico)
    return query({ winnerIco: valid }, opts)
  },

  async issuedBy(ico: string, opts?: RequestOptions): Promise<Tender[]> {
    const valid = assertValidICO(ico)
    return query({ authorityIco: valid }, opts)
  },

  async anomalies(ico: string, opts?: RequestOptions): Promise<TenderAnomaly[]> {
    const wonTenders = await tenders.wonBy(ico, opts)
    const out: TenderAnomaly[] = []
    const byAuthority = new Map<string, number>()
    for (const t of wonTenders) {
      byAuthority.set(t.contractingAuthority.ico, (byAuthority.get(t.contractingAuthority.ico) ?? 0) + 1)
    }
    for (const t of wonTenders) {
      const count = byAuthority.get(t.contractingAuthority.ico) ?? 0
      if (count >= 5) {
        out.push({
          type: 'repeat_winner',
          tenderId: t.id,
          description: `Won ${count} tenders from authority ${t.contractingAuthority.name}`,
          severity: count >= 10 ? 'suspicious' : 'warning',
        })
      }
    }
    return out
  },
}
