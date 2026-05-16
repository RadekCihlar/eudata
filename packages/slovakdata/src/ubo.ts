import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKBeneficialOwner } from './types.js'
import { assertValidICO } from './utils.js'

const RPVS_BASE = 'https://rpvs.gov.sk/api/v1'

interface RpvsOwnerRaw {
  meno?: string
  narodnost?: string
  datumNarodenia?: string | null
  podiel?: string | null
  registrovanyOd?: string
}

export const ubo = {
  async lookup(ico: string, opts?: RequestOptions): Promise<SKBeneficialOwner[]> {
    const valid = assertValidICO(ico)
    const res = await fetchJSON<{ owners?: RpvsOwnerRaw[] }>(
      `${RPVS_BASE}/entity/${valid}/owners`,
      { ...(opts ?? {}), source: 'sk:rpvs' }
    )
    return (res.owners ?? []).map((o) => ({
      name: o.meno ?? '',
      nationality: o.narodnost ?? '',
      dateOfBirth: o.datumNarodenia ?? null,
      share: o.podiel ?? null,
      registeredSince: o.registrovanyOd ?? '',
    }))
  },
}
