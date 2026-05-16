import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKFinancialStatement } from './types.js'
import { assertValidICO } from './utils.js'

const REGISTER_UZ_BASE = 'https://www.registeruz.sk/cruz-public/domain/accountingentity'

interface RegisterUzStatement {
  rok?: number
  typ?: string
  aktiva?: number
  vlastneImanie?: number
  vynosy?: number
  zisk?: number
  pocetZamestnancov?: number
  datumPodania?: string
  url?: string
}

interface RegisterUzResponse {
  ico?: string
  statements?: RegisterUzStatement[]
}

function mapType(t: string | undefined): SKFinancialStatement['type'] {
  const lower = (t ?? '').toLowerCase()
  if (lower.includes('konsolid')) return 'consolidated'
  if (lower.includes('zjednoduš')) return 'simplified'
  if (lower.includes('riadna') || lower.includes('standard')) return 'standard'
  return 'unknown'
}

function mapStatement(ico: string, s: RegisterUzStatement): SKFinancialStatement {
  return {
    ico,
    year: s.rok ?? 0,
    type: mapType(s.typ),
    totalAssets: s.aktiva ?? null,
    equity: s.vlastneImanie ?? null,
    revenue: s.vynosy ?? null,
    profit: s.zisk ?? null,
    employees: s.pocetZamestnancov ?? null,
    filedDate: s.datumPodania ?? '',
    documentUrl: s.url ?? null,
  }
}

export const financial = {
  async lookup(ico: string, opts?: RequestOptions): Promise<SKFinancialStatement[]> {
    const valid = assertValidICO(ico)
    const url = `${REGISTER_UZ_BASE}/simplesearch?ico=${valid}`
    const raw = await fetchJSON<RegisterUzResponse>(url, { ...(opts ?? {}), source: 'sk:registeruz' })
    return (raw.statements ?? []).map((s) => mapStatement(valid, s))
  },

  async latest(ico: string, opts?: RequestOptions): Promise<SKFinancialStatement | null> {
    const list = await financial.lookup(ico, opts)
    if (list.length === 0) return null
    return list.reduce((latest, curr) => (curr.year > latest.year ? curr : latest))
  },
}
