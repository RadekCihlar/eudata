import { fetchJSON, ValidationError } from 'eudata-common'
import type { RequestOptions, VinDecoded, VinRecall } from './types.js'

const NHTSA_DECODE = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin'
const NHTSA_RECALLS = 'https://api.nhtsa.gov/recalls/recallsByVehicle'

interface NhtsaResultRow {
  Variable: string
  Value: string | null
}

interface NhtsaResponse {
  Results?: NhtsaResultRow[]
}

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
}

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

function validateVinChecksum(vin: string): boolean {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const c = vin[i]!
    const val = /[0-9]/.test(c) ? Number(c) : TRANSLIT[c]
    if (val === undefined) return false
    sum += val * WEIGHTS[i]!
  }
  const mod = sum % 11
  const expected = mod === 10 ? 'X' : String(mod)
  return vin[8] === expected
}

function extractField(rows: NhtsaResultRow[], name: string): string {
  return rows.find((r) => r.Variable === name)?.Value ?? ''
}

function mapDecoded(vin: string, response: NhtsaResponse): VinDecoded {
  const rows = response.Results ?? []
  const yearStr = extractField(rows, 'Model Year')
  const doorsStr = extractField(rows, 'Doors')
  return {
    vin,
    make: extractField(rows, 'Make'),
    model: extractField(rows, 'Model'),
    year: yearStr ? Number(yearStr) : null,
    bodyType: extractField(rows, 'Body Class'),
    engineType: extractField(rows, 'Engine Configuration'),
    engineDisplacement: extractField(rows, 'Displacement (L)'),
    fuelType: extractField(rows, 'Fuel Type - Primary'),
    transmission: extractField(rows, 'Transmission Style'),
    driveType: extractField(rows, 'Drive Type'),
    doors: doorsStr ? Number(doorsStr) : null,
    plantCountry: extractField(rows, 'Plant Country'),
    plantCity: extractField(rows, 'Plant City') || null,
    vehicleType: extractField(rows, 'Vehicle Type'),
    _raw: response,
  }
}

export const vin = {
  validate(vinStr: string): boolean {
    return validateVinChecksum(vinStr.toUpperCase())
  },

  async decode(vinStr: string, opts?: RequestOptions): Promise<VinDecoded> {
    const upper = vinStr.toUpperCase()
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(upper)) {
      throw new ValidationError(`Invalid VIN format: ${vinStr}`, { source: 'czechdata' })
    }
    const url = `${NHTSA_DECODE}/${encodeURIComponent(upper)}?format=json`
    const res = await fetchJSON<NhtsaResponse>(url, { ...(opts ?? {}), source: 'cz:nhtsa' })
    return mapDecoded(upper, res)
  },

  async recalls(vinStr: string, opts?: RequestOptions): Promise<VinRecall[]> {
    const decoded = await vin.decode(vinStr, opts)
    if (!decoded.make || !decoded.model || !decoded.year) return []
    const params = new URLSearchParams({
      make: decoded.make,
      model: decoded.model,
      modelYear: String(decoded.year),
    })
    interface RecallRow {
      NHTSACampaignNumber?: string
      ReportReceivedDate?: string
      Component?: string
      Summary?: string
      Consequence?: string
      Remedy?: string
    }
    const res = await fetchJSON<{ results?: RecallRow[] }>(
      `${NHTSA_RECALLS}?${params.toString()}`,
      { ...(opts ?? {}), source: 'cz:nhtsa' }
    )
    return (res.results ?? []).map((r) => ({
      campaignNumber: r.NHTSACampaignNumber ?? '',
      date: r.ReportReceivedDate ?? '',
      component: r.Component ?? '',
      summary: r.Summary ?? '',
      consequence: r.Consequence ?? '',
      remedy: r.Remedy ?? '',
    }))
  },
}
