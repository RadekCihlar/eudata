import { fetchJSON } from 'eudata-common'
import type { GeoPoint, RequestOptions } from './types.js'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export interface GeocodeResult {
  formatted: string
  latitude: number
  longitude: number
  country: string
  countryCode: string
  state: string | null
  city: string | null
  postcode: string | null
  road: string | null
  houseNumber: string | null
  osmId: string
  osmType: string
  importance: number
}

interface NominatimSearchRow {
  place_id?: number
  osm_id?: number | string
  osm_type?: string
  display_name?: string
  lat?: string
  lon?: string
  importance?: number
  address?: {
    country?: string
    country_code?: string
    state?: string
    city?: string
    town?: string
    village?: string
    postcode?: string
    road?: string
    house_number?: string
  }
}

function mapResult(r: NominatimSearchRow): GeocodeResult {
  const a = r.address ?? {}
  return {
    formatted: r.display_name ?? '',
    latitude: r.lat ? Number(r.lat) : 0,
    longitude: r.lon ? Number(r.lon) : 0,
    country: a.country ?? '',
    countryCode: (a.country_code ?? '').toUpperCase(),
    state: a.state ?? null,
    city: a.city ?? a.town ?? a.village ?? null,
    postcode: a.postcode ?? null,
    road: a.road ?? null,
    houseNumber: a.house_number ?? null,
    osmId: String(r.osm_id ?? ''),
    osmType: r.osm_type ?? '',
    importance: r.importance ?? 0,
  }
}

export interface GeocodeSearchOptions extends RequestOptions {
  limit?: number
  countryCodes?: string[]
}

export const geocode = {
  async search(query: string, opts?: GeocodeSearchOptions): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: String(opts?.limit ?? 5),
    })
    if (opts?.countryCodes?.length) {
      params.set('countrycodes', opts.countryCodes.join(',').toLowerCase())
    }
    const res = await fetchJSON<NominatimSearchRow[]>(`${NOMINATIM_BASE}/search?${params}`, {
      ...(opts ?? {}),
      source: 'eu:nominatim',
    })
    return (Array.isArray(res) ? res : []).map(mapResult)
  },

  async reverse(point: GeoPoint, opts?: RequestOptions): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      lat: String(point.latitude),
      lon: String(point.longitude),
      format: 'json',
      addressdetails: '1',
    })
    try {
      const res = await fetchJSON<NominatimSearchRow>(`${NOMINATIM_BASE}/reverse?${params}`, {
        ...(opts ?? {}),
        source: 'eu:nominatim',
      })
      return mapResult(res)
    } catch {
      return null
    }
  },
}
