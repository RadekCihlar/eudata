import { fetchJSON } from 'eudata-common'
import type { ProductRecall, RecallCategory, RequestOptions } from './types.js'

const SAFETY_GATE_BASE =
  'https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertsList'

interface SafetyGateRow {
  id?: string
  notificationNumber?: string
  productName?: string
  brand?: string
  description?: string
  category?: string
  riskType?: string
  measuresTaken?: string
  notifyingCountry?: string
  notificationCountry?: string
  publishedDate?: string
  publicationDate?: string
  imageUrl?: string
}

interface SafetyGateResponse {
  content?: SafetyGateRow[]
}

const CATEGORY_MAP: Record<string, RecallCategory> = {
  toys: 'toys',
  'motor vehicles': 'motor_vehicles',
  electrical: 'electrical',
  cosmetics: 'cosmetics',
  food: 'food',
  clothing: 'clothing',
  furniture: 'furniture',
  chemicals: 'chemicals',
}

function mapCategory(raw: string | undefined): RecallCategory {
  if (!raw) return 'other'
  const lower = raw.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(k)) return v
  }
  return 'other'
}

function mapRow(r: SafetyGateRow): ProductRecall {
  return {
    id: r.id ?? r.notificationNumber ?? '',
    title: r.productName ?? '',
    description: r.description ?? '',
    category: mapCategory(r.category),
    brand: r.brand ?? '',
    product: r.productName ?? '',
    risk: r.riskType ?? '',
    measures: r.measuresTaken ?? '',
    notifyingCountry: r.notifyingCountry ?? r.notificationCountry ?? '',
    publishDate: r.publishedDate ?? r.publicationDate ?? '',
    imageUrl: r.imageUrl ?? null,
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<ProductRecall[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<SafetyGateResponse>(`${SAFETY_GATE_BASE}?${qs}`, {
    ...(opts ?? {}),
    source: 'cz:safety-gate',
  })
  return (res.content ?? []).map(mapRow)
}

export interface RecallSearchOptions extends RequestOptions {
  limit?: number
  fromDate?: string
  toDate?: string
}

export const recalls = {
  async search(queryText: string, opts?: RecallSearchOptions): Promise<ProductRecall[]> {
    return query({ q: queryText, size: String(opts?.limit ?? 50) }, opts)
  },

  async recent(days = 30, opts?: RequestOptions): Promise<ProductRecall[]> {
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000)
    return query(
      {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        size: '50',
      },
      opts
    )
  },

  async byCategory(category: RecallCategory, opts?: RequestOptions): Promise<ProductRecall[]> {
    return query({ category, size: '50' }, opts)
  },

  async checkProduct(identifier: string, opts?: RequestOptions): Promise<ProductRecall[]> {
    return query({ q: identifier, size: '50' }, opts)
  },
}
