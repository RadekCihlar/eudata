import { fetchJSON } from 'eudata-common'
import type {
  PLBoardMember,
  PLCompanyInfo,
  PLDirector,
  PLPKDCode,
  PLRegisterChange,
  PLSearchOptions,
  PLShareholder,
  RequestOptions,
} from './types.js'
import { assertValidNIP, formatKRS, normalizeAddress, type KrsAddressRaw } from './utils.js'

const KRS_API_BASE = 'https://api-krs.ms.gov.pl/api/krs'

interface KrsEntityRaw {
  numerKRS?: string
  nip?: string
  regon?: string
  nazwa?: string
  adres?: KrsAddressRaw
  formaPrawna?: string
  dataPowstania?: string
  dataRejestracji?: string
  dataWykreslenia?: string | null
  kapitalZakladowy?: number
  waluta?: string
  pkd?: Array<{ kod?: string; opis?: string; przewazajacy?: boolean }>
  sad?: string
  zarzad?: Array<{ imie?: string; nazwisko?: string; funkcja?: string; dataOd?: string | null; nrWpisuKRS?: string }>
  radaNadzorcza?: Array<{ imie?: string; nazwisko?: string; funkcja?: string; dataOd?: string | null }>
  status?: string
}

interface KrsResponse {
  odpis?: { dane?: { dzial1?: KrsEntityRaw } }
}

function mapStatus(s: string | undefined, dissolved: string | null): PLCompanyInfo['status'] {
  if (dissolved) return 'dissolved'
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('likwid')) return 'in_liquidation'
  if (lower.includes('upadl') || lower.includes('bankrupt')) return 'in_bankruptcy'
  if (lower.includes('akt')) return 'active'
  return 'unknown'
}

function mapPkd(rows: KrsEntityRaw['pkd']): PLPKDCode[] {
  return (rows ?? []).map((p) => ({
    code: p.kod ?? '',
    description: p.opis ?? '',
    primary: !!p.przewazajacy,
  }))
}

function mapDirectors(rows: KrsEntityRaw['zarzad']): PLDirector[] {
  return (rows ?? []).map((d) => ({
    name: `${d.imie ?? ''} ${d.nazwisko ?? ''}`.trim(),
    role: d.funkcja ?? '',
    since: d.dataOd ?? null,
    krsEntryNumber: d.nrWpisuKRS ?? null,
  }))
}

function mapBoard(rows: KrsEntityRaw['radaNadzorcza']): PLBoardMember[] {
  return (rows ?? []).map((b) => ({
    name: `${b.imie ?? ''} ${b.nazwisko ?? ''}`.trim(),
    role: b.funkcja ?? '',
    since: b.dataOd ?? null,
  }))
}

function mapEntity(raw: KrsResponse): PLCompanyInfo {
  const e = raw.odpis?.dane?.dzial1 ?? {}
  const dissolved = e.dataWykreslenia ?? null
  return {
    krs: e.numerKRS ?? '',
    nip: e.nip ?? '',
    regon: e.regon ?? '',
    name: (e.nazwa ?? '').trim(),
    address: normalizeAddress(e.adres),
    legalForm: e.formaPrawna ?? '',
    founded: e.dataPowstania ?? null,
    registered: e.dataRejestracji ?? null,
    dissolved,
    active: !dissolved,
    shareCapital: e.kapitalZakladowy ?? null,
    currency: e.waluta ?? 'PLN',
    pkdCodes: mapPkd(e.pkd),
    court: e.sad ?? '',
    directors: mapDirectors(e.zarzad),
    supervisoryBoard: mapBoard(e.radaNadzorcza),
    status: mapStatus(e.status, dissolved),
    _raw: raw,
  }
}

export const company = {
  async byKRS(krs: string, opts?: RequestOptions): Promise<PLCompanyInfo> {
    const valid = formatKRS(krs)
    const url = `${KRS_API_BASE}/OdpisAktualny/${valid}?rejestr=P&format=json`
    const raw = await fetchJSON<KrsResponse>(url, { ...(opts ?? {}), source: 'pl:krs' })
    return mapEntity(raw)
  },

  async byNIP(nip: string, opts?: RequestOptions): Promise<PLCompanyInfo> {
    const valid = assertValidNIP(nip)
    const url = `${KRS_API_BASE}/OdpisAktualny?nip=${valid}&rejestr=P&format=json`
    const raw = await fetchJSON<KrsResponse>(url, { ...(opts ?? {}), source: 'pl:krs' })
    return mapEntity(raw)
  },

  async search(name: string, opts?: PLSearchOptions): Promise<PLCompanyInfo[]> {
    const params = new URLSearchParams({ nazwa: name, limit: String(opts?.limit ?? 10) })
    const res = await fetchJSON<{ results?: KrsResponse[] }>(
      `${KRS_API_BASE}/szukaj?${params}`,
      { ...(opts ?? {}), source: 'pl:krs' }
    )
    return (res.results ?? []).map(mapEntity)
  },

  async directors(krs: string, opts?: RequestOptions): Promise<PLDirector[]> {
    const info = await company.byKRS(krs, opts)
    return info.directors
  },

  async shareholders(krs: string, opts?: RequestOptions): Promise<PLShareholder[]> {
    const valid = formatKRS(krs)
    interface SH {
      nazwa?: string
      typ?: string
      nip?: string
      udzialy?: number
      wartoscUdzialow?: number
      procent?: string
    }
    const res = await fetchJSON<{ wspolnicy?: SH[] }>(
      `${KRS_API_BASE}/OdpisAktualny/${valid}/wspolnicy?format=json`,
      { ...(opts ?? {}), source: 'pl:krs' }
    )
    return (res.wspolnicy ?? []).map((s) => ({
      name: s.nazwa ?? '',
      type: s.typ === 'firma' ? 'company' : 'person',
      nip: s.nip ?? null,
      shares: s.udzialy ?? null,
      shareValue: s.wartoscUdzialow ?? null,
      percentage: s.procent ?? null,
    }))
  },

  async history(krs: string, opts?: RequestOptions): Promise<PLRegisterChange[]> {
    const valid = formatKRS(krs)
    interface ChangeRow {
      data?: string
      typ?: string
      opis?: string
    }
    const res = await fetchJSON<{ zmiany?: ChangeRow[] }>(
      `${KRS_API_BASE}/OdpisPelny/${valid}/zmiany?format=json`,
      { ...(opts ?? {}), source: 'pl:krs' }
    )
    return (res.zmiany ?? []).map((c) => ({
      date: c.data ?? '',
      type: c.typ ?? '',
      description: c.opis ?? '',
    }))
  },
}
