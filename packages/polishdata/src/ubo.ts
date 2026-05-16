import { fetchJSON } from 'eudata-common'
import type { PLBeneficialOwner, RequestOptions } from './types.js'
import { assertValidNIP, formatKRS } from './utils.js'

const CRBR_BASE = 'https://crbr.podatki.gov.pl/api/v1'

interface CrbrOwnerRaw {
  imie?: string
  nazwisko?: string
  obywatelstwo?: string
  krajPobytu?: string
  procent?: number
  typKontroli?: 'bezposrednia' | 'posrednia' | 'inna'
  zarejestrowanyOd?: string
}

function mapControlType(t: string | undefined): PLBeneficialOwner['controlType'] {
  if (t === 'bezposrednia') return 'direct'
  if (t === 'posrednia') return 'indirect'
  return 'other'
}

function mapOwner(r: CrbrOwnerRaw): PLBeneficialOwner {
  return {
    firstName: r.imie ?? '',
    lastName: r.nazwisko ?? '',
    nationality: r.obywatelstwo ?? '',
    countryOfResidence: r.krajPobytu ?? '',
    ownershipPercentage: r.procent ?? null,
    controlType: mapControlType(r.typKontroli),
    registeredSince: r.zarejestrowanyOd ?? '',
  }
}

export const ubo = {
  async lookup(nip: string, opts?: RequestOptions): Promise<PLBeneficialOwner[]> {
    const valid = assertValidNIP(nip)
    const res = await fetchJSON<{ owners?: CrbrOwnerRaw[] }>(
      `${CRBR_BASE}/owners?nip=${valid}`,
      { ...(opts ?? {}), source: 'pl:crbr' }
    )
    return (res.owners ?? []).map(mapOwner)
  },

  async lookupByKRS(krs: string, opts?: RequestOptions): Promise<PLBeneficialOwner[]> {
    const valid = formatKRS(krs)
    const res = await fetchJSON<{ owners?: CrbrOwnerRaw[] }>(
      `${CRBR_BASE}/owners?krs=${valid}`,
      { ...(opts ?? {}), source: 'pl:crbr' }
    )
    return (res.owners ?? []).map(mapOwner)
  },
}
