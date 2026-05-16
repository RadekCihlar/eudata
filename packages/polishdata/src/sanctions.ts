import { fetchJSON } from 'eudata-common'
import type { PLSanctionsEntry, RequestOptions } from './types.js'

const PL_SANCTIONS_URL = 'https://api.mswia.gov.pl/sanctions/v1/list.json'

interface SanctionRaw {
  id?: string
  nazwa?: string
  aliasy?: string[]
  powod?: string
  dataWpisu?: string
}

export const sanctions = {
  async list(opts?: RequestOptions): Promise<PLSanctionsEntry[]> {
    const res = await fetchJSON<{ entries?: SanctionRaw[] }>(PL_SANCTIONS_URL, {
      ...(opts ?? {}),
      source: 'pl:sanctions',
    })
    return (res.entries ?? []).map((e) => ({
      id: e.id ?? '',
      name: e.nazwa ?? '',
      aliases: e.aliasy ?? [],
      reason: e.powod ?? '',
      designationDate: e.dataWpisu ?? '',
    }))
  },

  async check(name: string, opts?: RequestOptions): Promise<PLSanctionsEntry[]> {
    const entries = await sanctions.list(opts)
    const lower = name.toLowerCase()
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.aliases.some((a) => a.toLowerCase().includes(lower))
    )
  },
}
