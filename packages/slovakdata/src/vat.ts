import { fetchJSON } from 'eudata-common'
import type { RequestOptions, SKVatEntry, SKVatInfo } from './types.js'
import { assertValidICO } from './utils.js'

const FS_BASE = 'https://www.financnasprava.sk/api/v1'

interface FsVatRow {
  ico?: string
  dic?: string | null
  icDph?: string | null
  platcaDph?: boolean
  registrovanyOd?: string
  nespolehlivy?: boolean
  bankoveUcty?: Array<{ iban?: string; kod?: string; zverejneneOd?: string }>
}

function isIcDph(input: string): boolean {
  return /^SK\d{10}$/i.test(input.replace(/\s+/g, ''))
}

export const vat = {
  async check(icoOrVatId: string, opts?: RequestOptions): Promise<SKVatInfo> {
    const cleaned = icoOrVatId.replace(/\s+/g, '').toUpperCase()
    const ico = isIcDph(cleaned) ? '' : assertValidICO(cleaned)
    const url = ico
      ? `${FS_BASE}/vat?ico=${ico}`
      : `${FS_BASE}/vat?icDph=${encodeURIComponent(cleaned)}`
    const raw = await fetchJSON<FsVatRow>(url, { ...(opts ?? {}), source: 'sk:fs' })
    return {
      query: cleaned,
      ico: raw.ico ?? ico,
      dic: raw.dic ?? null,
      icDph: raw.icDph ?? null,
      vatPayer: !!raw.platcaDph,
      registeredSince: raw.registrovanyOd ?? null,
      unreliable: !!raw.nespolehlivy,
      bankAccounts: (raw.bankoveUcty ?? []).map((b) => ({
        iban: b.iban ?? '',
        bankCode: b.kod ?? null,
        publishedAt: b.zverejneneOd ?? null,
      })),
    }
  },

  async isUnreliable(icoOrVatId: string, opts?: RequestOptions): Promise<boolean> {
    const info = await vat.check(icoOrVatId, opts)
    return info.unreliable
  },

  async downloadPayerList(opts?: RequestOptions): Promise<SKVatEntry[]> {
    const res = await fetchJSON<{ data?: FsVatRow[] }>(`${FS_BASE}/vat/list`, {
      ...(opts ?? {}),
      source: 'sk:fs',
    })
    return (res.data ?? []).map((r) => ({
      icDph: r.icDph ?? '',
      ico: r.ico ?? '',
      name: '',
      registeredSince: r.registrovanyOd ?? '',
      unreliable: !!r.nespolehlivy,
    }))
  },
}
