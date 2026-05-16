import { fetchJSON } from 'eudata-common'
import type {
  AddressSuggestion,
  AddressValidation,
  FullAddress,
  GeoPoint,
  MunicipalityInfo,
  RequestOptions,
} from './types.js'

const VDP_BASE = 'https://vdp.cuzk.cz/vdp/ruian/rest'

interface RuianRow {
  kodAdresnihoMista?: string | number
  ulice?: string
  cisloDomovni?: string | number
  cisloOrientacni?: string | number
  obec?: string
  castObce?: string
  okres?: string
  kraj?: string
  psc?: string | number
  x?: number
  y?: number
  latitude?: number
  longitude?: number
}

function mapAddress(r: RuianRow): FullAddress {
  const street = r.ulice ?? null
  const houseNumber = r.cisloDomovni != null ? String(r.cisloDomovni) : ''
  const orientationNumber = r.cisloOrientacni != null ? String(r.cisloOrientacni) : null
  const formatted = [
    [street, [houseNumber, orientationNumber].filter(Boolean).join('/')].filter(Boolean).join(' '),
    [r.psc, r.obec].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')
  return {
    addressCode: String(r.kodAdresnihoMista ?? ''),
    street,
    houseNumber,
    orientationNumber,
    municipality: r.obec ?? '',
    municipalityPart: r.castObce ?? null,
    district: r.okres ?? null,
    region: r.kraj ?? '',
    postalCode: r.psc != null ? String(r.psc) : '',
    latitude: r.latitude ?? r.y ?? null,
    longitude: r.longitude ?? r.x ?? null,
    formatted,
  }
}

export const address = {
  async lookup(addressCode: string, opts?: RequestOptions): Promise<FullAddress> {
    const url = `${VDP_BASE}/adresni-mista/${encodeURIComponent(addressCode)}`
    const raw = await fetchJSON<RuianRow>(url, { ...(opts ?? {}), source: 'cz:ruian' })
    return mapAddress(raw)
  },

  async search(query: string, opts?: RequestOptions): Promise<AddressSuggestion[]> {
    const url = `${VDP_BASE}/adresni-mista/hledat?q=${encodeURIComponent(query)}`
    const res = await fetchJSON<{ vysledky?: RuianRow[] }>(url, { ...(opts ?? {}), source: 'cz:ruian' })
    return (res.vysledky ?? []).map((r) => ({
      addressCode: String(r.kodAdresnihoMista ?? ''),
      formatted: mapAddress(r).formatted,
    }))
  },

  async validate(input: string, opts?: RequestOptions): Promise<AddressValidation> {
    const suggestions = await address.search(input, opts)
    const best = suggestions[0]
    if (!best) return { valid: false, normalized: null, suggestions: [], confidence: 0 }
    const normalized = await address.lookup(best.addressCode, opts)
    const inputLower = input.toLowerCase()
    const normalizedLower = normalized.formatted.toLowerCase()
    const matchLen = [...inputLower].filter((c) => normalizedLower.includes(c)).length
    const confidence = Math.min(1, matchLen / Math.max(inputLower.length, 1))
    return { valid: true, normalized, suggestions, confidence }
  },

  async geocode(input: string, opts?: RequestOptions): Promise<GeoPoint> {
    const v = await address.validate(input, opts)
    if (!v.normalized || v.normalized.latitude == null || v.normalized.longitude == null) {
      return { latitude: 0, longitude: 0 }
    }
    return { latitude: v.normalized.latitude, longitude: v.normalized.longitude }
  },

  async municipality(code: string, opts?: RequestOptions): Promise<MunicipalityInfo> {
    const url = `${VDP_BASE}/obce/${encodeURIComponent(code)}`
    interface MunRow {
      kod?: string
      nazev?: string
      okres?: string
      kraj?: string
      pocetObyvatel?: number
    }
    const raw = await fetchJSON<MunRow>(url, { ...(opts ?? {}), source: 'cz:ruian' })
    return {
      code: raw.kod ?? code,
      name: raw.nazev ?? '',
      district: raw.okres ?? null,
      region: raw.kraj ?? null,
      population: raw.pocetObyvatel ?? null,
    }
  },
}
