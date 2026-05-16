import { fetchJSON, fetchText } from 'eudata-common'
import type {
  AirQuality,
  GeoPoint,
  RequestOptions,
  WaterLevel,
  WeatherCurrent,
  WeatherWarning,
} from './types.js'

const CHMI_BASE = 'https://www.chmi.cz/files/portal/docs'
const AQ_URL = `${CHMI_BASE}/uoco/web_generator/aqindex_cze.json`

interface AqStationRaw {
  station?: string
  longitude?: number
  latitude?: number
  index?: number
  pm25?: number | null
  pm10?: number | null
  o3?: number | null
  no2?: number | null
  so2?: number | null
  date?: string
}

function aqLevel(index: number | undefined): AirQuality['level'] {
  if (index == null) return 'unknown'
  if (index <= 1) return 'good'
  if (index === 2) return 'fair'
  if (index === 3) return 'moderate'
  if (index === 4) return 'poor'
  if (index === 5) return 'bad'
  return 'very_bad'
}

function pickClosest<T extends { latitude?: number; longitude?: number }>(
  rows: T[],
  point: GeoPoint
): T | null {
  let best: T | null = null
  let bestDist = Infinity
  for (const r of rows) {
    if (r.latitude == null || r.longitude == null) continue
    const dLat = r.latitude - point.latitude
    const dLon = r.longitude - point.longitude
    const d = dLat * dLat + dLon * dLon
    if (d < bestDist) {
      bestDist = d
      best = r
    }
  }
  return best
}

export const weather = {
  async airQuality(location: string | GeoPoint, opts?: RequestOptions): Promise<AirQuality> {
    const res = await fetchJSON<{ stations?: AqStationRaw[] }>(AQ_URL, {
      ...(opts ?? {}),
      source: 'cz:chmi',
    })
    const stations = res.stations ?? []
    const row =
      typeof location === 'string'
        ? stations.find((s) => (s.station ?? '').toLowerCase().includes(location.toLowerCase())) ??
          stations[0] ??
          null
        : pickClosest(stations, location)
    if (!row) {
      return {
        station: '',
        location: { latitude: 0, longitude: 0 },
        index: 0,
        level: 'unknown',
        pollutants: { pm25: null, pm10: null, o3: null, no2: null, so2: null },
        measuredAt: '',
      }
    }
    return {
      station: row.station ?? '',
      location: { latitude: row.latitude ?? 0, longitude: row.longitude ?? 0 },
      index: row.index ?? 0,
      level: aqLevel(row.index),
      pollutants: {
        pm25: row.pm25 ?? null,
        pm10: row.pm10 ?? null,
        o3: row.o3 ?? null,
        no2: row.no2 ?? null,
        so2: row.so2 ?? null,
      },
      measuredAt: row.date ?? '',
    }
  },

  async current(location: string | GeoPoint, opts?: RequestOptions): Promise<WeatherCurrent> {
    const url = `${CHMI_BASE}/meteo/ucasna.json`
    interface WxRow {
      station?: string
      temperature?: number
      humidity?: number
      pressure?: number
      windSpeed?: number
      latitude?: number
      longitude?: number
      measuredAt?: string
    }
    const res = await fetchJSON<{ stations?: WxRow[] }>(url, {
      ...(opts ?? {}),
      source: 'cz:chmi',
    })
    const stations = res.stations ?? []
    const row =
      typeof location === 'string'
        ? stations.find((s) => (s.station ?? '').toLowerCase().includes(location.toLowerCase())) ??
          stations[0] ??
          null
        : pickClosest(stations, location)
    if (!row) {
      return {
        station: '',
        temperature: null,
        humidity: null,
        pressure: null,
        windSpeed: null,
        measuredAt: '',
      }
    }
    return {
      station: row.station ?? '',
      temperature: row.temperature ?? null,
      humidity: row.humidity ?? null,
      pressure: row.pressure ?? null,
      windSpeed: row.windSpeed ?? null,
      measuredAt: row.measuredAt ?? '',
    }
  },

  async warnings(opts?: RequestOptions): Promise<WeatherWarning[]> {
    const url = `${CHMI_BASE}/meteo/sipa/sipa.json`
    interface WarningRaw {
      type?: string
      severity?: string
      regions?: string[]
      validFrom?: string
      validTo?: string
      description?: string
    }
    const res = await fetchJSON<{ warnings?: WarningRaw[] }>(url, {
      ...(opts ?? {}),
      source: 'cz:chmi',
    })
    return (res.warnings ?? []).map((w) => ({
      type: w.type ?? '',
      severity: (w.severity as 'yellow' | 'orange' | 'red') ?? 'yellow',
      regions: w.regions ?? [],
      validFrom: w.validFrom ?? '',
      validTo: w.validTo ?? '',
      description: w.description ?? '',
    }))
  },

  async waterLevels(station?: string, opts?: RequestOptions): Promise<WaterLevel[]> {
    const url = `${CHMI_BASE}/hydro/voda.json${station ? `?stanice=${encodeURIComponent(station)}` : ''}`
    interface WaterRaw {
      station?: string
      river?: string
      level?: number
      flow?: number
      trend?: string
      measuredAt?: string
    }
    try {
      const res = await fetchJSON<{ stations?: WaterRaw[] }>(url, {
        ...(opts ?? {}),
        source: 'cz:chmi',
      })
      return (res.stations ?? []).map((s) => ({
        station: s.station ?? '',
        river: s.river ?? '',
        level: s.level ?? 0,
        flow: s.flow ?? null,
        trend: (s.trend as 'rising' | 'falling' | 'steady') ?? 'steady',
        measuredAt: s.measuredAt ?? '',
      }))
    } catch {
      void fetchText
      return []
    }
  },
}
