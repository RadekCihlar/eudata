import { fetchJSON } from 'eudata-common'
import type { PLVatInfo, RequestOptions } from './types.js'
import { assertValidNIP } from './utils.js'

const WL_API_BASE = 'https://wl-api.mf.gov.pl/api'

interface WhiteListSubject {
  nip?: string
  name?: string
  statusVat?: string
  regon?: string | null
  krs?: string | null
  accountNumbers?: string[]
  workingAddress?: string
  registrationLegalDate?: string | null
  removalDate?: string | null
  restorationDate?: string | null
  hasVirtualAccounts?: boolean
}

interface WhiteListResponse {
  result?: {
    subject?: WhiteListSubject
    subjects?: WhiteListSubject[]
  }
}

function mapStatus(s: string | undefined): PLVatInfo['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower.includes('czynny') || lower === 'active') return 'active'
  if (lower.includes('zwolniony') || lower === 'exempt') return 'exempt'
  if (lower.includes('wykres') || lower === 'deregistered') return 'deregistered'
  if (lower.includes('not')) return 'not_registered'
  return 'unknown'
}

function mapSubject(s: WhiteListSubject | undefined): PLVatInfo {
  const subj = s ?? {}
  return {
    nip: subj.nip ?? '',
    name: subj.name ?? '',
    status: mapStatus(subj.statusVat),
    regon: subj.regon ?? null,
    krs: subj.krs ?? null,
    registeredBankAccounts: subj.accountNumbers ?? [],
    address: subj.workingAddress ?? '',
    registrationDate: subj.registrationLegalDate ?? null,
    deregistrationDate: subj.removalDate ?? null,
    restorationDate: subj.restorationDate ?? null,
    hasVirtualAccount: !!subj.hasVirtualAccounts,
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export const vat = {
  async check(nip: string, opts?: RequestOptions): Promise<PLVatInfo> {
    const valid = assertValidNIP(nip)
    const url = `${WL_API_BASE}/search/nip/${valid}?date=${todayDate()}`
    const res = await fetchJSON<WhiteListResponse>(url, { ...(opts ?? {}), source: 'pl:wl' })
    return mapSubject(res.result?.subject)
  },

  async verifyAccount(nip: string, bankAccount: string, opts?: RequestOptions): Promise<boolean> {
    const valid = assertValidNIP(nip)
    const url = `${WL_API_BASE}/check/nip/${valid}/bank-account/${encodeURIComponent(
      bankAccount.replace(/\s/g, '')
    )}?date=${todayDate()}`
    interface CheckResponse {
      result?: { accountAssigned?: 'TAK' | 'NIE' | string }
    }
    const res = await fetchJSON<CheckResponse>(url, { ...(opts ?? {}), source: 'pl:wl' })
    return res.result?.accountAssigned === 'TAK'
  },

  async checkBatch(nips: string[], opts?: RequestOptions): Promise<Map<string, PLVatInfo>> {
    if (nips.length > 30) {
      throw new Error('White List API supports max 30 NIPs per batch call')
    }
    const validated = nips.map(assertValidNIP)
    const joined = validated.join(',')
    const url = `${WL_API_BASE}/search/nips/${joined}?date=${todayDate()}`
    const res = await fetchJSON<WhiteListResponse>(url, { ...(opts ?? {}), source: 'pl:wl' })
    const map = new Map<string, PLVatInfo>()
    for (const subject of res.result?.subjects ?? []) {
      map.set(subject.nip ?? '', mapSubject(subject))
    }
    return map
  },
}
