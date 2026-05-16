import { fetchJSON } from 'eudata-common'
import type {
  PLCompanyInfo,
  PLDirector,
  PLPKDCode,
  PLRegisterChange,
  PLSearchOptions,
  PLShareholder,
  RequestOptions,
} from './types.js'
import { formatKRS, normalizeAddress, type KrsAddressRaw } from './utils.js'

const KRS_API_BASE = 'https://api-krs.ms.gov.pl/api/krs'

interface KrsAddressApi {
  ulica?: string
  nrDomu?: string
  nrLokalu?: string
  miejscowosc?: string
  kodPocztowy?: string
  kraj?: string
  wojewodztwo?: string
}

interface KrsDzial1 {
  danePodmiotu?: {
    nazwa?: string
    formaPrawna?: string
    identyfikatory?: { nip?: string; regon?: string }
  }
  siedzibaIAdres?: {
    siedziba?: { wojewodztwo?: string; miejscowosc?: string }
    adres?: KrsAddressApi
  }
  kapital?: { kapitalZakladowy?: string; wysokoscKapitaluWplaconego?: string }
  przedmiotDzialalnosci?: {
    przedmiotPrzewazajacejDzialalnosci?: Array<{ przedmiotDzialalnosci?: { kodPKD?: string; opis?: string } }>
    przedmiotPozostalejDzialalnosci?: Array<{ przedmiotDzialalnosci?: { kodPKD?: string; opis?: string } }>
  }
}

interface KrsResponse {
  odpis?: {
    naglowekA?: {
      numerKRS?: string
      dataRejestracjiWKRS?: string
      oznaczenieSaduDokonujacegoOstatniegoWpisu?: string
    }
    dane?: {
      dzial1?: KrsDzial1
      dzial2?: {
        reprezentacja?: {
          nazwaOrganu?: string
          sposobReprezentacji?: string
          sklad?: Array<{
            nazwisko?: { nazwiskoICzlon?: string; nazwiskoIICzlon?: string }
            imiona?: { imie?: string; imieDrugie?: string }
            funkcjaWOrganie?: string
            czyZawieszona?: boolean
          }>
        }
        organNadzoru?: Array<{
          nazwa?: string
          sklad?: Array<{
            nazwisko?: { nazwiskoICzlon?: string; nazwiskoIICzlon?: string }
            imiona?: { imie?: string; imieDrugie?: string }
          }>
        }>
      }
      dzial6?: {
        likwidacja?: { dataRozwiazania?: string }
        upadlosc?: { dataPostanowieniaOOgloszeniuUpadlosci?: string }
      }
    }
  }
}

function mapStatus(raw: KrsResponse, dissolved: string | null, bankrupt: string | null): PLCompanyInfo['status'] {
  if (dissolved) return 'in_liquidation'
  if (bankrupt) return 'in_bankruptcy'
  return raw.odpis?.naglowekA?.numerKRS ? 'active' : 'unknown'
}

function adaptAddress(a: KrsAddressApi | undefined): KrsAddressRaw {
  if (!a) return {}
  return {
    ulica: a.ulica,
    numerBudynku: a.nrDomu,
    numerLokalu: a.nrLokalu,
    miejscowosc: a.miejscowosc,
    kodPocztowy: a.kodPocztowy,
    wojewodztwo: a.wojewodztwo,
    kraj: a.kraj,
  }
}

function parsePlnAmount(s: string | undefined): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function mapPkd(d: KrsDzial1 | undefined): PLPKDCode[] {
  if (!d?.przedmiotDzialalnosci) return []
  const out: PLPKDCode[] = []
  for (const row of d.przedmiotDzialalnosci.przedmiotPrzewazajacejDzialalnosci ?? []) {
    if (row.przedmiotDzialalnosci?.kodPKD) {
      out.push({
        code: row.przedmiotDzialalnosci.kodPKD,
        description: row.przedmiotDzialalnosci.opis ?? '',
        primary: true,
      })
    }
  }
  for (const row of d.przedmiotDzialalnosci.przedmiotPozostalejDzialalnosci ?? []) {
    if (row.przedmiotDzialalnosci?.kodPKD) {
      out.push({
        code: row.przedmiotDzialalnosci.kodPKD,
        description: row.przedmiotDzialalnosci.opis ?? '',
        primary: false,
      })
    }
  }
  return out
}

function fullName(
  imiona: { imie?: string; imieDrugie?: string } | undefined,
  nazwisko: { nazwiskoICzlon?: string; nazwiskoIICzlon?: string } | undefined
): string {
  return [imiona?.imie, imiona?.imieDrugie, nazwisko?.nazwiskoICzlon, nazwisko?.nazwiskoIICzlon]
    .filter((p) => p && p.trim() !== '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapDirectors(raw: KrsResponse): PLDirector[] {
  const sklad = raw.odpis?.dane?.dzial2?.reprezentacja?.sklad ?? []
  return sklad.map((s) => {
    return {
      name: fullName(s.imiona, s.nazwisko),
      role: s.funkcjaWOrganie ?? '',
      since: null,
      krsEntryNumber: null,
    }
  })
}

function mapSupervisoryBoard(raw: KrsResponse): { name: string; role: string; since: string | null }[] {
  const organs = raw.odpis?.dane?.dzial2?.organNadzoru ?? []
  const out: { name: string; role: string; since: string | null }[] = []
  for (const organ of organs) {
    for (const s of organ.sklad ?? []) {
      out.push({
        name: fullName(s.imiona, s.nazwisko),
        role: organ.nazwa ?? 'RADA NADZORCZA',
        since: null,
      })
    }
  }
  return out
}

function mapEntity(raw: KrsResponse): PLCompanyInfo {
  const d1 = raw.odpis?.dane?.dzial1 ?? {}
  const d6 = raw.odpis?.dane?.dzial6 ?? {}
  const dane = d1.danePodmiotu ?? {}
  const naglowek = raw.odpis?.naglowekA ?? {}
  const dissolved = d6.likwidacja?.dataRozwiazania ?? null
  const bankrupt = d6.upadlosc?.dataPostanowieniaOOgloszeniuUpadlosci ?? null
  return {
    krs: naglowek.numerKRS ?? '',
    nip: dane.identyfikatory?.nip ?? '',
    regon: dane.identyfikatory?.regon ?? '',
    name: (dane.nazwa ?? '').trim(),
    address: normalizeAddress(adaptAddress(d1.siedzibaIAdres?.adres)),
    legalForm: dane.formaPrawna ?? '',
    founded: naglowek.dataRejestracjiWKRS ?? null,
    registered: naglowek.dataRejestracjiWKRS ?? null,
    dissolved,
    active: !dissolved && !bankrupt,
    shareCapital: parsePlnAmount(d1.kapital?.kapitalZakladowy),
    currency: 'PLN',
    pkdCodes: mapPkd(d1),
    court: naglowek.oznaczenieSaduDokonujacegoOstatniegoWpisu ?? '',
    directors: mapDirectors(raw),
    supervisoryBoard: mapSupervisoryBoard(raw),
    status: mapStatus(raw, dissolved, bankrupt),
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

  async byNIP(_nip: string, _opts?: RequestOptions): Promise<PLCompanyInfo> {
    throw new Error(
      'KRS API requires a 10-digit KRS number; lookup-by-NIP is not exposed publicly. Use byKRS instead.'
    )
  },

  async search(_name: string, _opts?: PLSearchOptions): Promise<PLCompanyInfo[]> {
    throw new Error(
      'KRS API has no public search endpoint; use byKRS with a known KRS number.'
    )
  },

  async directors(krs: string, opts?: RequestOptions): Promise<PLDirector[]> {
    const info = await company.byKRS(krs, opts)
    return info.directors
  },

  async shareholders(_krs: string, _opts?: RequestOptions): Promise<PLShareholder[]> {
    throw new Error('Shareholders not exposed by KRS public API; use eKRS portal scraping.')
  },

  async history(_krs: string, _opts?: RequestOptions): Promise<PLRegisterChange[]> {
    throw new Error('History endpoint not available on public KRS API; use eKRS portal.')
  },
}
