import { fetchJSON } from 'eudata-common'
import type { RequestOptions, TradeLicenseInfo } from './types.js'
import { assertValidICO } from './utils.js'

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty'

interface AresTradeBlob {
  ico?: string | number
  obchodniJmeno?: string
  seznamRegistraci?: Record<string, string>
}

export const trade = {
  async lookup(ico: string, opts?: RequestOptions): Promise<TradeLicenseInfo> {
    const valid = assertValidICO(ico)
    const raw = await fetchJSON<AresTradeBlob>(`${ARES_BASE}/${valid}`, {
      ...(opts ?? {}),
      source: 'cz:ares',
    })
    const rzpStatus = raw.seznamRegistraci?.['stavZdrojeRzp']
    const active = rzpStatus?.toUpperCase() === 'AKTIVNI'
    return {
      ico: valid,
      name: (raw.obchodniJmeno ?? '').trim(),
      licenses: active
        ? [
            {
              type: 'unknown',
              name: 'Trade license registered (detail requires RŽP scraping)',
              validFrom: null,
              validTo: null,
              suspended: false,
            },
          ]
        : [],
      hasActiveLicense: active,
    }
  },

  async isActive(ico: string, opts?: RequestOptions): Promise<boolean> {
    const info = await trade.lookup(ico, opts)
    return info.hasActiveLicense
  },
}
