import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const EUIPO_BASE = 'https://euipo.europa.eu/copla/api/search'

export interface EUTrademark {
  applicationNumber: string
  name: string
  type: 'word' | 'figurative' | '3d' | 'sound' | 'other'
  status: 'registered' | 'pending' | 'expired' | 'opposed' | 'withdrawn' | 'unknown'
  owner: string
  filingDate: string
  registrationDate: string | null
  expiryDate: string | null
  niceClasses: number[]
  imageUrl: string | null
}

interface EuipoRaw {
  applicationNumber?: string
  markVerbalElement?: string
  markFeature?: string
  status?: string
  applicantName?: string
  applicationDate?: string
  registrationDate?: string | null
  expiryDate?: string | null
  niceClasses?: number[]
  markImageUrl?: string | null
}

function mapType(s: string | undefined): EUTrademark['type'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('word')) return 'word'
  if (lower.includes('figur')) return 'figurative'
  if (lower.includes('3d')) return '3d'
  if (lower.includes('sound')) return 'sound'
  return 'other'
}

function mapStatus(s: string | undefined): EUTrademark['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('reg')) return 'registered'
  if (lower.includes('pend') || lower.includes('apply')) return 'pending'
  if (lower.includes('expir')) return 'expired'
  if (lower.includes('oppos')) return 'opposed'
  if (lower.includes('withdr')) return 'withdrawn'
  return 'unknown'
}

function mapTrademark(r: EuipoRaw): EUTrademark {
  return {
    applicationNumber: r.applicationNumber ?? '',
    name: r.markVerbalElement ?? '',
    type: mapType(r.markFeature),
    status: mapStatus(r.status),
    owner: r.applicantName ?? '',
    filingDate: r.applicationDate ?? '',
    registrationDate: r.registrationDate ?? null,
    expiryDate: r.expiryDate ?? null,
    niceClasses: r.niceClasses ?? [],
    imageUrl: r.markImageUrl ?? null,
  }
}

export interface TrademarkSearchOptions extends RequestOptions {
  limit?: number
  niceClasses?: number[]
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<EUTrademark[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ results?: EuipoRaw[] }>(`${EUIPO_BASE}?${qs}`, {
    ...(opts ?? {}),
    source: 'eu:euipo',
  })
  return (res.results ?? []).map(mapTrademark)
}

export const trademark = {
  async search(queryText: string, opts?: TrademarkSearchOptions): Promise<EUTrademark[]> {
    const params: Record<string, string> = { q: queryText, limit: String(opts?.limit ?? 50) }
    if (opts?.niceClasses?.length) params['niceClasses'] = opts.niceClasses.join(',')
    return query(params, opts)
  },

  async check(name: string, niceClasses?: number[], opts?: RequestOptions): Promise<EUTrademark[]> {
    const params: Record<string, string> = { mark: name }
    if (niceClasses?.length) params['niceClasses'] = niceClasses.join(',')
    return query(params, opts)
  },

  async byOwner(ownerName: string, opts?: RequestOptions): Promise<EUTrademark[]> {
    return query({ owner: ownerName }, opts)
  },
}
