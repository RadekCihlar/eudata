import * as cz from 'czechdata'
import * as sk from 'slovakdata'
import * as pl from 'polishdata'
import { vies, sanctions as euSanctions, lei, trademark, universal } from 'eudata'
import { validateNipChecksum } from 'eudata-common'

type Handler = (id: string) => Promise<unknown>

const handlers: Record<string, Handler> = {
  // CZ
  'cz/company': (id) => cz.company.lookup(id),
  'cz/insolvency': (id) => cz.insolvency.check(id),
  'cz/vat': (id) => cz.vat.check(id),
  'cz/trade': (id) => cz.trade.lookup(id),
  'cz/execution': (id) => cz.execution.checkCompany(id),
  'cz/vehicle': (id) => cz.vehicle.byPlate(id),
  'cz/vin': (id) => cz.vin.decode(id),
  'cz/address': (id) => cz.address.validate(id),
  'cz/court': (id) => cz.court.commercialRegister(id),
  'cz/budget': (id) => cz.budget.municipality(id, new Date().getFullYear() - 1),
  'cz/cadastre': async (id) => {
    const [area, parcel] = id.split('/parcela=')
    return cz.cadastre.parcel(area ?? '', parcel ?? '')
  },
  'cz/tenders': (id) => cz.tenders.search(id, { limit: 20 }),
  'cz/recalls': (id) => cz.recalls.search(id, { limit: 20 }),
  'cz/weather': (id) => cz.weather.airQuality(id),
  'cz/food': (id) => cz.food.search(id, { limit: 20 }),
  'cz/environment': (id) => cz.environment.emissions(id),
  'cz/risk': (id) => cz.risk.assess(id),

  // SK
  'sk/company': (id) => sk.company.lookup(id),
  'sk/insolvency': (id) => sk.insolvency.check(id),
  'sk/vat': (id) => sk.vat.check(id),
  'sk/debtors': (id) => sk.debtors.check(id),
  'sk/financial': (id) => sk.financial.lookup(id),
  'sk/court': (id) => sk.court.byCompany(id),
  'sk/contracts': (id) => sk.contracts.byCompany(id),
  'sk/tenders': (id) => sk.tenders.search(id, { limit: 20 }),
  'sk/ubo': (id) => sk.ubo.lookup(id),
  'sk/risk': (id) => sk.risk.assess(id),

  // PL
  'pl/company': (id) => {
    const digits = id.replace(/\D/g, '')
    if (digits.length === 10 && validateNipChecksum(digits)) return pl.company.byNIP(digits)
    return pl.company.byKRS(digits)
  },
  'pl/sole-trader': (id) => pl.soleTrader.byNIP(id),
  'pl/vat': (id) => pl.vat.check(id),
  'pl/insolvency': (id) => pl.insolvency.check(id),
  'pl/ubo': (id) => pl.ubo.lookup(id),
  'pl/tenders': (id) => pl.tenders.search(id, { limit: 20 }),
  'pl/sanctions': (id) => pl.sanctions.check(id),
  'pl/risk': (id) => pl.risk.assess(id),

  // EU
  'eu/universal': (id) => universal.lookup(id),
  'eu/vies': (id) => vies.validate(id),
  'eu/sanctions': (id) => euSanctions.check(id),
  'eu/lei': async (id) => {
    if (/^[A-Z0-9]{20}$/.test(id)) return lei.lookup(id)
    return lei.search(id)
  },
  'eu/trademark': (id) => trademark.search(id, { limit: 20 }),
}

export async function dispatchModule(
  country: string,
  slug: string,
  id: string
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number; detail?: unknown }> {
  const key = `${country}/${slug}`
  const handler = handlers[key]
  if (!handler) return { ok: false, error: `Unknown module: ${key}`, status: 404 }
  try {
    const data = await handler(id)
    return { ok: true, data }
  } catch (e) {
    const err = e as { name?: string; message?: string; status?: number; body?: string }
    return {
      ok: false,
      error: err.message ?? 'Unknown error',
      status: err.status ?? 500,
      detail: err.name ? { name: err.name, body: err.body } : undefined,
    }
  }
}
