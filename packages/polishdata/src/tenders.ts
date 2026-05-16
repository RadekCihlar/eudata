import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'
import { assertValidNIP } from './utils.js'

const UZP_BASE = 'https://www.uzp.gov.pl/api/v1'

export interface PLTender {
  id: string
  title: string
  authority: { name: string; nip: string }
  estimatedValue: number | null
  currency: string
  publishDate: string
  deadline: string | null
  status: 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown'
  cpvCodes: string[]
  winner?: { name: string; nip: string; awardedValue: number }
}

interface UzpRow {
  id?: string
  tytul?: string
  zamawiajacy?: string
  zamawiajacyNip?: string
  szacowanaWartosc?: number
  waluta?: string
  dataPublikacji?: string
  terminSkladania?: string
  stan?: string
  kodyCPV?: string[]
  wykonawca?: string
  wykonawcaNip?: string
  wykonawcaWartosc?: number
}

function mapStatus(s: string | undefined): PLTender['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('otwart') || lower.includes('open')) return 'open'
  if (lower.includes('zamkn') || lower.includes('closed')) return 'closed'
  if (lower.includes('udzielon') || lower.includes('awarded')) return 'awarded'
  if (lower.includes('uniew') || lower.includes('cancel')) return 'cancelled'
  return 'unknown'
}

function mapTender(t: UzpRow): PLTender {
  const tender: PLTender = {
    id: t.id ?? '',
    title: t.tytul ?? '',
    authority: { name: t.zamawiajacy ?? '', nip: t.zamawiajacyNip ?? '' },
    estimatedValue: t.szacowanaWartosc ?? null,
    currency: t.waluta ?? 'PLN',
    publishDate: t.dataPublikacji ?? '',
    deadline: t.terminSkladania ?? null,
    status: mapStatus(t.stan),
    cpvCodes: t.kodyCPV ?? [],
  }
  if (t.wykonawca || t.wykonawcaNip) {
    tender.winner = {
      name: t.wykonawca ?? '',
      nip: t.wykonawcaNip ?? '',
      awardedValue: t.wykonawcaWartosc ?? 0,
    }
  }
  return tender
}

export interface PLTenderSearchOptions extends RequestOptions {
  limit?: number
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<PLTender[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ tenders?: UzpRow[] }>(`${UZP_BASE}/tenders?${qs}`, {
    ...(opts ?? {}),
    source: 'pl:uzp',
  })
  return (res.tenders ?? []).map(mapTender)
}

export const tenders = {
  async search(queryText: string, opts?: PLTenderSearchOptions): Promise<PLTender[]> {
    return query({ q: queryText, limit: String(opts?.limit ?? 50) }, opts)
  },

  async wonBy(nip: string, opts?: RequestOptions): Promise<PLTender[]> {
    const valid = assertValidNIP(nip)
    return query({ winnerNip: valid }, opts)
  },

  async issuedBy(nip: string, opts?: RequestOptions): Promise<PLTender[]> {
    const valid = assertValidNIP(nip)
    return query({ authorityNip: valid }, opts)
  },
}
