import { fetchJSON } from 'eudata-common'
import type { FoodAlert, FoodSearchOptions, RequestOptions } from './types.js'

const RASFF_BASE = 'https://webgate.ec.europa.eu/rasff-window/screen/api/search'

interface RasffRow {
  id?: string
  title?: string
  classification?: string
  product?: string
  category?: string
  hazard?: string
  origin?: string
  distribution?: string[]
  date?: string
  notifyingCountry?: string
}

function mapType(c: string | undefined): FoodAlert['type'] {
  const lower = (c ?? '').toLowerCase()
  if (lower.includes('alert')) return 'alert'
  if (lower.includes('border')) return 'border_rejection'
  if (lower.includes('information')) return 'information'
  return 'news'
}

function mapAlert(r: RasffRow): FoodAlert {
  return {
    id: r.id ?? '',
    title: r.title ?? '',
    type: mapType(r.classification),
    product: r.product ?? '',
    category: r.category ?? '',
    hazard: r.hazard ?? '',
    origin: r.origin ?? '',
    distributedTo: r.distribution ?? [],
    date: r.date ?? '',
    notifiedBy: r.notifyingCountry ?? '',
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<FoodAlert[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ results?: RasffRow[] }>(`${RASFF_BASE}?${qs}`, {
    ...(opts ?? {}),
    source: 'cz:rasff',
  })
  return (res.results ?? []).map(mapAlert)
}

export const food = {
  async search(queryText: string, opts?: FoodSearchOptions): Promise<FoodAlert[]> {
    const params: Record<string, string> = { q: queryText, limit: String(opts?.limit ?? 50) }
    if (opts?.fromDate) params['from'] = opts.fromDate
    if (opts?.toDate) params['to'] = opts.toDate
    return query(params, opts)
  },

  async recentCZ(days = 30, opts?: RequestOptions): Promise<FoodAlert[]> {
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000)
    return query(
      {
        country: 'CZ',
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
      opts
    )
  },

  async byCategory(category: string, opts?: RequestOptions): Promise<FoodAlert[]> {
    return query({ category }, opts)
  },
}
