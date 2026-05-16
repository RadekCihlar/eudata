import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKContract } from './types.js'
import { assertValidICO } from './utils.js'

const CRZ_BASE = 'https://www.crz.gov.sk/api/v2'

interface CrzRow {
  id?: string
  nazov?: string
  dodavatelNazov?: string
  dodavatelIco?: string
  obstaravatelNazov?: string
  obstaravatelIco?: string
  hodnota?: number
  mena?: string
  datumPodpisu?: string
  datumZverejnenia?: string
  typ?: string
  documentUrl?: string
}

function mapContract(r: CrzRow): SKContract {
  return {
    id: r.id ?? '',
    title: r.nazov ?? '',
    contractor: { name: r.dodavatelNazov ?? '', ico: r.dodavatelIco ?? '' },
    authority: { name: r.obstaravatelNazov ?? '', ico: r.obstaravatelIco ?? '' },
    value: r.hodnota ?? null,
    currency: r.mena ?? 'EUR',
    signedDate: r.datumPodpisu ?? '',
    publishedDate: r.datumZverejnenia ?? '',
    type: r.typ ?? '',
    documentUrl: r.documentUrl ?? '',
  }
}

async function query(params: Record<string, string>, opts?: RequestOptions): Promise<SKContract[]> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetchJSON<{ contracts?: CrzRow[] }>(`${CRZ_BASE}/contracts?${qs}`, {
    ...(opts ?? {}),
    source: 'sk:crz',
  })
  return (res.contracts ?? []).map(mapContract)
}

export const contracts = {
  async byCompany(ico: string, opts?: RequestOptions): Promise<SKContract[]> {
    const valid = assertValidICO(ico)
    return query({ ico: valid }, opts)
  },

  async search(queryText: string, opts?: RequestOptions): Promise<SKContract[]> {
    return query({ q: queryText }, opts)
  },
}
