import { fetchJSON } from 'eudata-common'
import type { RequestOptions, VIESConfirmation, VIESResult } from './types.js'

const VIES_BASE = 'https://ec.europa.eu/taxation_customs/vies/rest-api'

interface ViesResponse {
  isValid?: boolean
  countryCode?: string
  vatNumber?: string
  name?: string | null
  address?: string | null
  requestDate?: string
  consultationNumber?: string
}

function splitVat(input: string): { country: string; number: string } {
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  const m = /^([A-Z]{2})(.+)$/.exec(cleaned)
  if (!m) throw new Error(`Invalid VAT format: ${input}`)
  return { country: m[1]!, number: m[2]! }
}

function mapResponse(res: ViesResponse, fallbackVat: string): VIESResult {
  return {
    vatNumber: res.vatNumber ?? fallbackVat,
    countryCode: res.countryCode ?? '',
    valid: !!res.isValid,
    name: res.name ?? null,
    address: res.address ?? null,
    requestDate: res.requestDate ?? new Date().toISOString(),
  }
}

export const vies = {
  async validate(vatNumber: string, opts?: RequestOptions): Promise<VIESResult> {
    const { country, number } = splitVat(vatNumber)
    const url = `${VIES_BASE}/check-vat-number`
    const res = await fetchJSON<ViesResponse>(url, {
      ...(opts ?? {}),
      source: 'eu:vies',
      method: 'POST',
      body: JSON.stringify({ countryCode: country, vatNumber: number }),
      contentType: 'application/json',
    })
    return mapResponse(res, `${country}${number}`)
  },

  async validateWithRequester(
    vatNumber: string,
    requesterVat: string,
    opts?: RequestOptions
  ): Promise<VIESConfirmation> {
    const { country, number } = splitVat(vatNumber)
    const requester = splitVat(requesterVat)
    const url = `${VIES_BASE}/check-vat-number`
    const res = await fetchJSON<ViesResponse>(url, {
      ...(opts ?? {}),
      source: 'eu:vies',
      method: 'POST',
      body: JSON.stringify({
        countryCode: country,
        vatNumber: number,
        requesterMemberStateCode: requester.country,
        requesterNumber: requester.number,
      }),
      contentType: 'application/json',
    })
    const base = mapResponse(res, `${country}${number}`)
    return {
      ...base,
      requesterVat,
      consultationNumber: res.consultationNumber ?? '',
    }
  },

  async batchValidate(
    vatNumbers: string[],
    opts?: RequestOptions
  ): Promise<Map<string, VIESResult>> {
    const results = await Promise.allSettled(vatNumbers.map((v) => vies.validate(v, opts)))
    const map = new Map<string, VIESResult>()
    vatNumbers.forEach((vat, idx) => {
      const r = results[idx]!
      if (r.status === 'fulfilled') map.set(vat, r.value)
    })
    return map
  },
}
