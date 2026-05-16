import { fetchJSON } from 'eudata-common'
import type {
  EmissionReport,
  GeoPoint,
  Polluter,
  RequestOptions,
  Violation,
} from './types.js'
import { assertValidICO } from './utils.js'

const IRZ_BASE = 'https://www.irz.cz/api'
const CIZP_BASE = 'https://www.cizp.cz/api'

interface IrzEmissionRow {
  substance?: string
  amount?: number
  unit?: string
  medium?: 'air' | 'water' | 'soil'
}

interface IrzFacilityRaw {
  nazev?: string
  ico?: string
  latitude?: number
  longitude?: number
  rok?: number
  emissions?: IrzEmissionRow[]
}

export const environment = {
  async emissions(ico: string, opts?: RequestOptions): Promise<EmissionReport> {
    const valid = assertValidICO(ico)
    const url = `${IRZ_BASE}/facility?ico=${valid}`
    const raw = await fetchJSON<IrzFacilityRaw>(url, { ...(opts ?? {}), source: 'cz:irz' })
    return {
      facility: raw.nazev ?? '',
      ico: raw.ico ?? valid,
      location: { latitude: raw.latitude ?? 0, longitude: raw.longitude ?? 0 },
      year: raw.rok ?? new Date().getFullYear() - 1,
      emissions: (raw.emissions ?? []).map((e) => ({
        substance: e.substance ?? '',
        amount: e.amount ?? 0,
        unit: e.unit ?? '',
        medium: e.medium ?? 'air',
      })),
    }
  },

  async violations(query: string, opts?: RequestOptions): Promise<Violation[]> {
    const url = `${CIZP_BASE}/violations?q=${encodeURIComponent(query)}`
    interface ViolationRaw {
      spolecnost?: string
      ico?: string | null
      datum?: string
      typ?: string
      popis?: string
      pokuta?: number
      reseni?: string
    }
    const res = await fetchJSON<{ data?: ViolationRaw[] }>(url, {
      ...(opts ?? {}),
      source: 'cz:cizp',
    })
    return (res.data ?? []).map((v) => ({
      company: v.spolecnost ?? '',
      ico: v.ico ?? null,
      date: v.datum ?? '',
      type: v.typ ?? '',
      description: v.popis ?? '',
      fine: v.pokuta ?? null,
      resolution: v.reseni ?? '',
    }))
  },

  async nearbyPolluters(
    location: GeoPoint,
    radiusKm = 10,
    opts?: RequestOptions
  ): Promise<Polluter[]> {
    const url = `${IRZ_BASE}/facilities/nearby?lat=${location.latitude}&lon=${location.longitude}&radius=${radiusKm}`
    interface NearbyRaw {
      nazev?: string
      ico?: string
      latitude?: number
      longitude?: number
      distanceKm?: number
      pollutants?: string[]
    }
    const res = await fetchJSON<{ facilities?: NearbyRaw[] }>(url, {
      ...(opts ?? {}),
      source: 'cz:irz',
    })
    return (res.facilities ?? []).map((f) => ({
      facility: f.nazev ?? '',
      ico: f.ico ?? '',
      location: { latitude: f.latitude ?? 0, longitude: f.longitude ?? 0 },
      distanceKm: f.distanceKm ?? 0,
      pollutants: f.pollutants ?? [],
    }))
  },
}
