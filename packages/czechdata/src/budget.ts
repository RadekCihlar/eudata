import { fetchJSON } from 'eudata-common'
import type {
  BudgetCategory,
  BudgetComparison,
  BudgetOrg,
  MunicipalBudget,
  RequestOptions,
  StateBudget,
} from './types.js'
import { assertValidICO } from './utils.js'

const MONITOR_BASE = 'https://monitor.statnipokladna.cz/api'

interface MonitorBudgetRow {
  paragraf?: string
  paragrafNazev?: string
  schvalenyRozpocet?: number
  upravenyRozpocet?: number
  vysledekHospodareni?: number
  cerpani?: number
}

interface MonitorBudgetResponse {
  ico?: string
  nazev?: string
  rok?: number
  prijmy?: MonitorBudgetRow[]
  vydaje?: MonitorBudgetRow[]
  zadluzeni?: number
}

function mapCategory(r: MonitorBudgetRow): BudgetCategory {
  const planned = r.upravenyRozpocet ?? r.schvalenyRozpocet ?? 0
  const actual = r.cerpani ?? r.vysledekHospodareni ?? 0
  return {
    code: r.paragraf ?? '',
    name: r.paragrafNazev ?? '',
    planned,
    actual,
    percentUsed: planned > 0 ? (actual / planned) * 100 : 0,
  }
}

function aggregate(rows: MonitorBudgetRow[]): { planned: number; actual: number; categories: BudgetCategory[] } {
  const categories = rows.map(mapCategory)
  return {
    planned: categories.reduce((s, c) => s + c.planned, 0),
    actual: categories.reduce((s, c) => s + c.actual, 0),
    categories,
  }
}

function mapBudget(raw: MonitorBudgetResponse, year: number, ico: string): MunicipalBudget {
  const income = aggregate(raw.prijmy ?? [])
  const expenses = aggregate(raw.vydaje ?? [])
  return {
    ico: raw.ico ?? ico,
    name: raw.nazev ?? '',
    year: raw.rok ?? year,
    income,
    expenses,
    balance: income.actual - expenses.actual,
    debtTotal: raw.zadluzeni ?? 0,
  }
}

export const budget = {
  async municipality(ico: string, year: number, opts?: RequestOptions): Promise<MunicipalBudget> {
    const valid = assertValidICO(ico)
    const url = `${MONITOR_BASE}/municipality/${valid}/${year}`
    const raw = await fetchJSON<MonitorBudgetResponse>(url, { ...(opts ?? {}), source: 'cz:monitor' })
    return mapBudget(raw, year, valid)
  },

  async stateOrg(ico: string, year: number, opts?: RequestOptions): Promise<StateBudget> {
    const valid = assertValidICO(ico)
    const url = `${MONITOR_BASE}/state-org/${valid}/${year}`
    const raw = await fetchJSON<MonitorBudgetResponse>(url, { ...(opts ?? {}), source: 'cz:monitor' })
    return mapBudget(raw, year, valid)
  },

  async compare(ico: string, years: number[], opts?: RequestOptions): Promise<BudgetComparison> {
    const valid = assertValidICO(ico)
    const budgets = await Promise.all(years.map((y) => budget.municipality(valid, y, opts)))
    const incomeByYear: Record<number, number> = {}
    const expensesByYear: Record<number, number> = {}
    const debtByYear: Record<number, number> = {}
    for (const b of budgets) {
      incomeByYear[b.year] = b.income.actual
      expensesByYear[b.year] = b.expenses.actual
      debtByYear[b.year] = b.debtTotal
    }
    return {
      ico: valid,
      name: budgets[0]?.name ?? '',
      years,
      incomeByYear,
      expensesByYear,
      debtByYear,
    }
  },

  async searchOrg(name: string, opts?: RequestOptions): Promise<BudgetOrg[]> {
    const url = `${MONITOR_BASE}/orgs?q=${encodeURIComponent(name)}`
    interface OrgRow {
      ico?: string
      nazev?: string
      typ?: string
    }
    const res = await fetchJSON<{ data?: OrgRow[] }>(url, { ...(opts ?? {}), source: 'cz:monitor' })
    return (res.data ?? []).map((o) => ({
      ico: o.ico ?? '',
      name: o.nazev ?? '',
      type: o.typ ?? '',
    }))
  },

  async category(
    ico: string,
    year: number,
    category: string,
    opts?: RequestOptions
  ): Promise<BudgetCategory | null> {
    const b = await budget.municipality(ico, year, opts)
    return b.expenses.categories.find((c) => c.code === category) ?? null
  },
}
