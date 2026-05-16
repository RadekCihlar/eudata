import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKTradeLicenseInfo } from './types.js'
import { assertValidICO } from './utils.js'

const ZRSR_BASE = 'https://www.zrsr.sk/api/v1'

interface ZrsrRow {
  ico?: string
  meno?: string
  licencie?: Array<{
    typ?: string
    nazov?: string
    platnostOd?: string
    platnostDo?: string | null
  }>
}

export const trade = {
  async lookup(ico: string, opts?: RequestOptions): Promise<SKTradeLicenseInfo> {
    const valid = assertValidICO(ico)
    const raw = await fetchJSON<ZrsrRow>(`${ZRSR_BASE}/entity/${valid}`, {
      ...(opts ?? {}),
      source: 'sk:zrsr',
    })
    const licenses = (raw.licencie ?? []).map((l) => ({
      type: l.typ ?? '',
      name: l.nazov ?? '',
      validFrom: l.platnostOd ?? null,
      validTo: l.platnostDo ?? null,
    }))
    return {
      ico: valid,
      name: raw.meno ?? '',
      licenses,
      hasActiveLicense: licenses.some((l) => !l.validTo),
    }
  },
}
