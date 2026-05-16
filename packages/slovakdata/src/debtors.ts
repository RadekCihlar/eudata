import { fetchJSON } from 'eudata-common'
import type {
  RequestOptions,
  SKDebtorEntry,
  SKDebtorLists,
  SKDebtorResult,
  SKDebtorSource,
} from './types.js'
import { assertValidICO } from './utils.js'

const SOURCES: Record<SKDebtorSource, string> = {
  social_insurance: 'https://www.socpoist.sk/api/debtors',
  vszp: 'https://www.vszp.sk/api/debtors',
  dovera: 'https://www.dovera.sk/api/debtors',
  union: 'https://www.union.sk/api/debtors',
}

interface DebtorRaw {
  ico?: string
  meno?: string
  dlh?: number
  mena?: string
  datum?: string
}

async function fetchSource(
  source: SKDebtorSource,
  opts?: RequestOptions
): Promise<SKDebtorEntry[]> {
  try {
    const res = await fetchJSON<{ data?: DebtorRaw[] }>(SOURCES[source], {
      ...(opts ?? {}),
      source: `sk:${source}`,
    })
    return (res.data ?? []).map((r) => ({
      source,
      name: r.meno ?? '',
      ico: r.ico ?? '',
      amountOwed: r.dlh ?? null,
      currency: r.mena ?? 'EUR',
      asOfDate: r.datum ?? '',
    }))
  } catch {
    return []
  }
}

export const debtors = {
  async check(ico: string, opts?: RequestOptions): Promise<SKDebtorResult> {
    const valid = assertValidICO(ico)
    const allSources = Object.keys(SOURCES) as SKDebtorSource[]
    const results = await Promise.all(allSources.map((s) => fetchSource(s, opts)))
    const entries = results
      .flat()
      .filter((e) => e.ico === valid)
    return {
      ico: valid,
      isDebtor: entries.length > 0,
      entries,
    }
  },

  async downloadAll(opts?: RequestOptions): Promise<SKDebtorLists> {
    const [socialInsurance, vszp, dovera, union] = await Promise.all([
      fetchSource('social_insurance', opts),
      fetchSource('vszp', opts),
      fetchSource('dovera', opts),
      fetchSource('union', opts),
    ])
    return {
      socialInsurance,
      vszp,
      dovera,
      union,
      lastUpdated: new Date().toISOString(),
    }
  },
}
