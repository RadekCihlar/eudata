import { fetchJSON } from 'eudata-common'
import type { PLPKDCode, PLSearchOptions, PLSoleTrader, RequestOptions } from './types.js'
import { assertValidNIP, formatREGON, normalizeAddress, type KrsAddressRaw } from './utils.js'

const CEIDG_BASE = 'https://dane.biznes.gov.pl/api/ceidg/v2'

interface CeidgEntityRaw {
  nazwa?: string
  wlasciciel?: { imie?: string; nazwisko?: string }
  nip?: string
  regon?: string
  adresGlowny?: KrsAddressRaw
  adresKorespondencyjny?: KrsAddressRaw
  status?: string
  dataRozpoczecia?: string
  dataZakonczenia?: string | null
  zawieszonaOd?: string | null
  zawieszonaDo?: string | null
  pkd?: Array<{ kod?: string; opis?: string; przewazajacy?: boolean }>
  wspolnoscMajatkowa?: boolean
  maWspolnikow?: boolean
}

function mapStatus(s: string | undefined): PLSoleTrader['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('akt')) return 'active'
  if (lower.includes('zaw')) return 'suspended'
  if (lower.includes('zakon') || lower.includes('ceased')) return 'ceased'
  if (lower.includes('wykres') || lower.includes('deleted')) return 'deleted'
  return 'unknown'
}

function mapPkd(rows: CeidgEntityRaw['pkd']): PLPKDCode[] {
  return (rows ?? []).map((p) => ({
    code: p.kod ?? '',
    description: p.opis ?? '',
    primary: !!p.przewazajacy,
  }))
}

function mapEntity(raw: CeidgEntityRaw): PLSoleTrader {
  return {
    name: (raw.nazwa ?? '').trim(),
    ownerName: `${raw.wlasciciel?.imie ?? ''} ${raw.wlasciciel?.nazwisko ?? ''}`.trim(),
    nip: raw.nip ?? '',
    regon: raw.regon ?? '',
    address: normalizeAddress(raw.adresGlowny),
    mailingAddress: raw.adresKorespondencyjny ? normalizeAddress(raw.adresKorespondencyjny) : null,
    status: mapStatus(raw.status),
    startDate: raw.dataRozpoczecia ?? '',
    endDate: raw.dataZakonczenia ?? null,
    suspendedFrom: raw.zawieszonaOd ?? null,
    suspendedTo: raw.zawieszonaDo ?? null,
    pkdCodes: mapPkd(raw.pkd),
    communityProperty: !!raw.wspolnoscMajatkowa,
    hasPartners: !!raw.maWspolnikow,
    _raw: raw,
  }
}

export const soleTrader = {
  async byNIP(nip: string, opts?: RequestOptions): Promise<PLSoleTrader> {
    const valid = assertValidNIP(nip)
    const url = `${CEIDG_BASE}/firma?nip=${valid}`
    const raw = await fetchJSON<CeidgEntityRaw>(url, { ...(opts ?? {}), source: 'pl:ceidg' })
    return mapEntity(raw)
  },

  async byREGON(regon: string, opts?: RequestOptions): Promise<PLSoleTrader> {
    const valid = formatREGON(regon)
    const url = `${CEIDG_BASE}/firma?regon=${valid}`
    const raw = await fetchJSON<CeidgEntityRaw>(url, { ...(opts ?? {}), source: 'pl:ceidg' })
    return mapEntity(raw)
  },

  async search(name: string, opts?: PLSearchOptions): Promise<PLSoleTrader[]> {
    const params = new URLSearchParams({ q: name, limit: String(opts?.limit ?? 10) })
    const res = await fetchJSON<{ firmy?: CeidgEntityRaw[] }>(`${CEIDG_BASE}/firmy?${params}`, {
      ...(opts ?? {}),
      source: 'pl:ceidg',
    })
    return (res.firmy ?? []).map(mapEntity)
  },
}
