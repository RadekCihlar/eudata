import { fetchText, NotFoundError } from 'eudata-common'
import type {
  InspectionRecord,
  OdometerAnomaly,
  OdometerReport,
  RequestOptions,
  VehicleInfo,
} from './types.js'

const ISTP_BASE = 'https://www.mdcr.cz/istp/vozidlo'

async function fetchHtml(plateOrVin: string, kind: 'plate' | 'vin', opts?: RequestOptions): Promise<string> {
  const param = kind === 'plate' ? 'spz' : 'vin'
  try {
    return await fetchText(`${ISTP_BASE}?${param}=${encodeURIComponent(plateOrVin)}`, {
      ...(opts ?? {}),
      source: 'cz:istp',
    })
  } catch (e) {
    if (e instanceof NotFoundError) return ''
    throw e
  }
}

function parseInspections(html: string): InspectionRecord[] {
  const rows = html.match(/<tr[^>]*class="[^"]*inspection[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  return rows.map((row) => {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? []).map((c) =>
      c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    )
    return {
      date: cells[0] ?? '',
      type: 'STK',
      result: (cells[1] ?? '').toLowerCase().includes('vyhov') ? 'pass' : 'unknown',
      mileageKm: cells[2] ? Number(cells[2].replace(/\D/g, '')) : null,
      station: cells[3] ?? null,
      defects: [],
    }
  })
}

function detectOdometerAnomalies(readings: Array<{ date: string; km: number }>): OdometerAnomaly[] {
  const anomalies: OdometerAnomaly[] = []
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const curr = sorted[i]!
    if (curr.km < prev.km) {
      anomalies.push({
        type: 'rollback',
        fromDate: prev.date,
        toDate: curr.date,
        fromKm: prev.km,
        toKm: curr.km,
        message: `Odometer decreased from ${prev.km} to ${curr.km} km`,
      })
    }
    const dayDiff =
      (Date.parse(curr.date) - Date.parse(prev.date)) / (1000 * 60 * 60 * 24)
    if (dayDiff > 0 && (curr.km - prev.km) / dayDiff > 500) {
      anomalies.push({
        type: 'excessive_daily_average',
        fromDate: prev.date,
        toDate: curr.date,
        fromKm: prev.km,
        toKm: curr.km,
        message: `Average >500 km/day between inspections`,
      })
    }
  }
  return anomalies
}

export const vehicle = {
  async byPlate(plate: string, opts?: RequestOptions): Promise<VehicleInfo> {
    const html = await fetchHtml(plate, 'plate', opts)
    return {
      plate,
      vin: (html.match(/VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/i) ?? [, null])[1] ?? null,
      stkExpiry: (html.match(/Platnost STK[:\s]+([0-9.\-]+)/i) ?? [, null])[1] ?? null,
      emissionExpiry: (html.match(/Emise[:\s]+([0-9.\-]+)/i) ?? [, null])[1] ?? null,
      inspections: parseInspections(html),
    }
  },

  async byVIN(vinStr: string, opts?: RequestOptions): Promise<VehicleInfo> {
    const html = await fetchHtml(vinStr, 'vin', opts)
    return {
      plate: (html.match(/SPZ[:\s]+([A-Z0-9]+)/i) ?? [, ''])[1] ?? '',
      vin: vinStr,
      stkExpiry: (html.match(/Platnost STK[:\s]+([0-9.\-]+)/i) ?? [, null])[1] ?? null,
      emissionExpiry: (html.match(/Emise[:\s]+([0-9.\-]+)/i) ?? [, null])[1] ?? null,
      inspections: parseInspections(html),
    }
  },

  async stkExpiry(plate: string, opts?: RequestOptions): Promise<string | null> {
    const info = await vehicle.byPlate(plate, opts)
    return info.stkExpiry
  },

  async odometerCheck(plate: string, opts?: RequestOptions): Promise<OdometerReport> {
    const info = await vehicle.byPlate(plate, opts)
    const readings = info.inspections
      .filter((i) => i.mileageKm != null)
      .map((i) => ({ date: i.date, km: i.mileageKm! }))
    const anomalies = detectOdometerAnomalies(readings)
    return {
      plate,
      readings,
      anomalies,
      suspicious: anomalies.length > 0,
    }
  },
}
