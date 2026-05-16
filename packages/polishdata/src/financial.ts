import { fetchJSON } from 'eudata-common'
import type { PLFinancialStatement, RequestOptions } from './types.js'
import { formatKRS } from './utils.js'

const EKRS_BASE = 'https://ekrs.ms.gov.pl/rdf/pd/api'

interface EkrsStatementRaw {
  rok?: number
  format?: string
  standard?: string
  aktywaRazem?: number
  kapitalWlasny?: number
  przychody?: number
  zyskNetto?: number
  dataZlozenia?: string
  url?: string
}

function mapFormat(s: string | undefined): PLFinancialStatement['format'] {
  if (s === 'xml_pas' || s === 'PAS') return 'xml_pas'
  if (s === 'xhtml_ifrs' || s === 'IFRS') return 'xhtml_ifrs'
  return 'unknown'
}

function mapStandard(s: string | undefined): PLFinancialStatement['standard'] {
  if (s === 'PAS') return 'PAS'
  if (s === 'IFRS') return 'IFRS'
  return 'unknown'
}

function mapStatement(krs: string, r: EkrsStatementRaw): PLFinancialStatement {
  return {
    krs,
    year: r.rok ?? 0,
    format: mapFormat(r.format),
    totalAssets: r.aktywaRazem ?? null,
    equity: r.kapitalWlasny ?? null,
    revenue: r.przychody ?? null,
    netProfit: r.zyskNetto ?? null,
    filedDate: r.dataZlozenia ?? '',
    documentUrl: r.url ?? '',
    standard: mapStandard(r.standard),
  }
}

export const financial = {
  async lookup(krs: string, opts?: RequestOptions): Promise<PLFinancialStatement[]> {
    const valid = formatKRS(krs)
    const url = `${EKRS_BASE}/financial-statements?krs=${valid}`
    const res = await fetchJSON<{ statements?: EkrsStatementRaw[] }>(url, {
      ...(opts ?? {}),
      source: 'pl:ekrs',
    })
    return (res.statements ?? []).map((s) => mapStatement(valid, s))
  },

  async latest(krs: string, opts?: RequestOptions): Promise<PLFinancialStatement | null> {
    const list = await financial.lookup(krs, opts)
    if (list.length === 0) return null
    return list.reduce((latest, curr) => (curr.year > latest.year ? curr : latest))
  },
}
