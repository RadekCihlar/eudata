import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKCompanyInfo, SKDirector, SKSearchOptions, SKShareholder } from './types.js'
import { assertValidICO, normalizeAddress, type OrsfAddressRaw } from './utils.js'

const ORSF_BASE = 'https://api.orsf.sk/v1'

interface OrsfEntity {
  ico?: string | number
  obchodneMeno?: string
  adresa?: OrsfAddressRaw
  pravnaForma?: string
  datumVzniku?: string
  datumZaniku?: string | null
  dic?: string | null
  icDph?: string | null
  skNace?: string[]
  zakladneImanie?: number
  mena?: string
  sud?: string
  oddiel?: string
  vlozka?: string
  konatelia?: Array<{
    meno?: string
    funkcia?: string
    od?: string
    do?: string | null
    adresa?: string
  }>
  rolesLocked?: boolean
}

interface OrsfSearchResponse {
  results?: OrsfEntity[]
}

function mapDirectors(raw: OrsfEntity['konatelia']): SKDirector[] {
  return (raw ?? []).map((d) => ({
    name: d.meno ?? '',
    role: d.funkcia ?? '',
    since: d.od ?? null,
    until: d.do ?? null,
    address: d.adresa ?? null,
  }))
}

function mapEntity(raw: OrsfEntity): SKCompanyInfo {
  const ico = String(raw.ico ?? '').padStart(8, '0')
  return {
    ico,
    name: (raw.obchodneMeno ?? '').trim(),
    address: normalizeAddress(raw.adresa),
    legalForm: raw.pravnaForma ?? '',
    founded: raw.datumVzniku ?? null,
    dissolved: raw.datumZaniku ?? null,
    active: !raw.datumZaniku,
    dic: raw.dic ?? null,
    icDph: raw.icDph ?? null,
    skNace: raw.skNace ?? [],
    registeredCapital: raw.zakladneImanie ?? null,
    currency: raw.mena ?? 'EUR',
    court: raw.sud ?? null,
    section: raw.oddiel ?? null,
    insertNumber: raw.vlozka ?? null,
    directors: mapDirectors(raw.konatelia),
    _raw: raw,
  }
}

import { orsr } from './orsr.js'

export const company = {
  async lookup(ico: string, opts?: RequestOptions): Promise<SKCompanyInfo> {
    const valid = assertValidICO(ico)
    try {
      const raw = await fetchJSON<OrsfEntity>(`${ORSF_BASE}/entity/${valid}`, {
        ...(opts ?? {}),
        source: 'sk:orsf',
      })
      return mapEntity(raw)
    } catch {
      return orsr.lookup(valid, opts)
    }
  },

  async search(name: string, opts?: SKSearchOptions): Promise<SKCompanyInfo[]> {
    const params = new URLSearchParams({ q: name, limit: String(opts?.limit ?? 10) })
    if (opts?.activeOnly) params.set('activeOnly', 'true')
    const res = await fetchJSON<OrsfSearchResponse>(`${ORSF_BASE}/search?${params}`, {
      ...(opts ?? {}),
      source: 'sk:orsf',
    })
    return (res.results ?? []).map(mapEntity)
  },

  async directors(ico: string, opts?: RequestOptions): Promise<SKDirector[]> {
    const info = await company.lookup(ico, opts)
    return info.directors
  },

  async shareholders(ico: string, opts?: RequestOptions): Promise<SKShareholder[]> {
    const valid = assertValidICO(ico)
    interface ShareholderRaw {
      meno?: string
      typ?: string
      ico?: string
      podiel?: string
      vklad?: number
      splateno?: number
    }
    const res = await fetchJSON<{ akcionari?: ShareholderRaw[] }>(
      `${ORSF_BASE}/entity/${valid}/shareholders`,
      { ...(opts ?? {}), source: 'sk:orsf' }
    )
    return (res.akcionari ?? []).map((s) => ({
      name: s.meno ?? '',
      type: s.typ === 'firma' ? 'company' : 'person',
      ico: s.ico ?? null,
      share: s.podiel ?? null,
      contribution: s.vklad ?? null,
      paidUp: s.splateno ?? null,
    }))
  },
}
