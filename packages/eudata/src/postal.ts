import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const ZIPPOPOTAM_BASE = 'https://api.zippopotam.us'

export interface PostalPlace {
  placeName: string
  state: string | null
  stateAbbr: string | null
  latitude: number | null
  longitude: number | null
}

export interface PostalLookup {
  countryCode: string
  country: string
  postcode: string
  places: PostalPlace[]
}

interface ZpResponse {
  'post code'?: string
  country?: string
  'country abbreviation'?: string
  places?: Array<{
    'place name'?: string
    state?: string
    'state abbreviation'?: string
    latitude?: string
    longitude?: string
  }>
}

function parseFloatOrNull(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const postal = {
  async lookup(country: string, postcode: string, opts?: RequestOptions): Promise<PostalLookup> {
    const cc = country.toLowerCase().trim()
    const pc = postcode.trim().replace(/\s+/g, '')
    const url = `${ZIPPOPOTAM_BASE}/${encodeURIComponent(cc)}/${encodeURIComponent(pc)}`
    const res = await fetchJSON<ZpResponse>(url, { ...(opts ?? {}), source: 'eu:postal' })
    return {
      countryCode: (res['country abbreviation'] ?? cc.toUpperCase()),
      country: res.country ?? '',
      postcode: res['post code'] ?? pc,
      places: (res.places ?? []).map((p) => ({
        placeName: p['place name'] ?? '',
        state: p.state ?? null,
        stateAbbr: p['state abbreviation'] ?? null,
        latitude: parseFloatOrNull(p.latitude),
        longitude: parseFloatOrNull(p.longitude),
      })),
    }
  },
}
