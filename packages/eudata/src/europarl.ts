import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const EP_BASE = 'https://data.europarl.europa.eu/api/v2'

export interface MEP {
  id: string
  familyName: string | null
  givenName: string | null
  country: string | null
  politicalGroup: string | null
  nationalParty: string | null
  url: string
}

export interface MEPSearchOptions extends RequestOptions {
  country?: string
  group?: string
  query?: string
  limit?: number
}

interface EpListResponse {
  data?: Array<{
    identifier?: string
    label?: string
    family_name?: string
    given_name?: string
    api_endpoint?: string
  }>
}

interface EpDetailResponse {
  data?: Array<{
    identifier?: string
    family_name?: string
    given_name?: string
    citizenship?: { id?: string; label?: string } | string
    membership?: Array<{
      organization?: { label?: string } | string
      role?: string
    }>
  }>
}

function asLabel(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const o = v as { label?: string; id?: string }
    return o.label ?? o.id ?? null
  }
  return null
}

export const europarl = {
  async meps(opts: MEPSearchOptions = {}): Promise<MEP[]> {
    const params = new URLSearchParams({ format: 'application/ld+json' })
    if (opts.country) params.set('country-code', opts.country.toUpperCase())
    if (opts.limit) params.set('limit', String(opts.limit))
    const url = `${EP_BASE}/meps?${params.toString()}`
    const res = await fetchJSON<EpListResponse>(url, { ...opts, source: 'eu:europarl' })
    return (res.data ?? []).map((d) => ({
      id: d.identifier ?? '',
      familyName: d.family_name ?? null,
      givenName: d.given_name ?? null,
      country: opts.country ?? null,
      politicalGroup: null,
      nationalParty: null,
      url: d.api_endpoint ?? `${EP_BASE}/meps/${d.identifier ?? ''}`,
    }))
  },

  async mep(id: string, opts?: RequestOptions): Promise<MEP | null> {
    const url = `${EP_BASE}/meps/${encodeURIComponent(id)}?format=application/ld+json`
    const res = await fetchJSON<EpDetailResponse>(url, { ...(opts ?? {}), source: 'eu:europarl' })
    const d = res.data?.[0]
    if (!d) return null
    const memberships = d.membership ?? []
    const group = memberships.find((m) => /group/i.test(m.role ?? ''))
    const party = memberships.find((m) => /national/i.test(m.role ?? '') || /party/i.test(m.role ?? ''))
    return {
      id: d.identifier ?? id,
      familyName: d.family_name ?? null,
      givenName: d.given_name ?? null,
      country: asLabel(d.citizenship),
      politicalGroup: asLabel(group?.organization),
      nationalParty: asLabel(party?.organization),
      url: `${EP_BASE}/meps/${id}`,
    }
  },
}
