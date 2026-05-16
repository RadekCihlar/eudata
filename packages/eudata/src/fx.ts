import { fetchJSON, fetchText, xmlTagText } from 'eudata-common'
import type { RequestOptions } from './types.js'

export type FxSource = 'NBP' | 'CNB' | 'ECB'

export interface FxRate {
  source: FxSource
  base: string
  quote: string
  rate: number
  date: string
}

interface NbpResponse {
  rates?: Array<{ mid?: number; effectiveDate?: string }>
  code?: string
}

async function nbpRate(quote: string, date?: string, opts?: RequestOptions): Promise<FxRate | null> {
  if (quote === 'PLN') return { source: 'NBP', base: 'PLN', quote: 'PLN', rate: 1, date: date ?? new Date().toISOString().slice(0, 10) }
  const path = date
    ? `https://api.nbp.pl/api/exchangerates/rates/A/${quote}/${date}?format=json`
    : `https://api.nbp.pl/api/exchangerates/rates/A/${quote}?format=json`
  try {
    const res = await fetchJSON<NbpResponse>(path, { ...(opts ?? {}), source: 'eu:nbp' })
    const r = res.rates?.[0]
    if (!r?.mid) return null
    return { source: 'NBP', base: 'PLN', quote, rate: r.mid, date: r.effectiveDate ?? '' }
  } catch {
    return null
  }
}

async function cnbRates(opts?: RequestOptions): Promise<FxRate[]> {
  const url = 'https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt'
  const text = await fetchText(url, { ...(opts ?? {}), source: 'eu:cnb' })
  const lines = text.split(/\r?\n/)
  if (lines.length < 3) return []
  const dateMatch = /(\d{2})\.(\d{2})\.(\d{4})/.exec(lines[0] ?? '')
  const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : ''
  const out: FxRate[] = []
  for (const line of lines.slice(2)) {
    const cols = line.split('|')
    if (cols.length < 5) continue
    const unit = Number(cols[2])
    const code = cols[3]
    const rate = Number((cols[4] ?? '').replace(',', '.'))
    if (!code || !unit || Number.isNaN(rate)) continue
    out.push({ source: 'CNB', base: 'CZK', quote: code, rate: rate / unit, date })
  }
  return out
}

interface FrankfurterResponse {
  base?: string
  date?: string
  rates?: Record<string, number>
}

async function ecbRates(base: string, date?: string, opts?: RequestOptions): Promise<FxRate[]> {
  const url = `https://api.frankfurter.app/${date ?? 'latest'}?from=${base}`
  const res = await fetchJSON<FrankfurterResponse>(url, { ...(opts ?? {}), source: 'eu:ecb' })
  if (!res.rates) return []
  return Object.entries(res.rates).map(([quote, rate]) => ({
    source: 'ECB' as const,
    base: res.base ?? base,
    quote,
    rate,
    date: res.date ?? '',
  }))
}

export const fx = {
  async nbp(quote: string, date?: string, opts?: RequestOptions): Promise<FxRate | null> {
    return nbpRate(quote.toUpperCase(), date, opts)
  },

  async cnb(opts?: RequestOptions): Promise<FxRate[]> {
    return cnbRates(opts)
  },

  async ecb(base = 'EUR', date?: string, opts?: RequestOptions): Promise<FxRate[]> {
    return ecbRates(base.toUpperCase(), date, opts)
  },

  async convert(amount: number, from: string, to: string, date?: string, opts?: RequestOptions): Promise<{ amount: number; rate: number; via: FxSource } | null> {
    const fromU = from.toUpperCase()
    const toU = to.toUpperCase()
    if (fromU === toU) return { amount, rate: 1, via: 'ECB' }
    const ecb = await ecbRates(fromU, date, opts).catch(() => [])
    const direct = ecb.find((r) => r.quote === toU)
    if (direct) return { amount: amount * direct.rate, rate: direct.rate, via: 'ECB' }
    if (fromU === 'PLN') {
      const r = await nbpRate(toU, date, opts)
      if (r) return { amount: amount * r.rate, rate: r.rate, via: 'NBP' }
    }
    return null
  },
}

// Silence "unused import" warning when xmlTagText is not referenced directly.
void xmlTagText
