import { company } from './company.js'
import { debtors } from './debtors.js'
import { insolvency } from './insolvency.js'
import { vat } from './vat.js'
import type {
  RequestOptions,
  SKCompanyInfo,
  SKDebtorResult,
  SKInsolvencyResult,
  SKRiskFlag,
  SKRiskLevel,
  SKRiskReport,
  SKVatInfo,
} from './types.js'
import { assertValidICO } from './utils.js'

function levelFromScore(s: number): SKRiskLevel {
  if (s >= 80) return 'low'
  if (s >= 60) return 'medium'
  if (s >= 30) return 'high'
  return 'critical'
}

function yearsBetween(iso: string | null, now: Date): number | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
}

interface ScoreInput {
  company: SKCompanyInfo
  insolvency: SKInsolvencyResult
  vat: SKVatInfo | null
  debtors: SKDebtorResult | null
  now: Date
}

function computeScore(input: ScoreInput): { score: number; flags: SKRiskFlag[] } {
  const flags: SKRiskFlag[] = []
  let score = 100
  let cap = Infinity

  if (input.company.dissolved) {
    flags.push({ source: 'orsf', code: 'DISSOLVED', message: 'Company dissolved', severity: 'critical' })
    cap = Math.min(cap, 5)
  }

  if (input.insolvency.insolvent) {
    flags.push({ source: 'ru', code: 'INSOLVENCY_ACTIVE', message: 'Active insolvency', severity: 'critical' })
    cap = Math.min(cap, 10)
  }

  const socIns = input.debtors?.entries.find((e) => e.source === 'social_insurance')
  if (socIns) {
    flags.push({
      source: 'socpoist',
      code: 'SOCIAL_INS_DEBT',
      message: 'On Sociálna poisťovňa debtor list',
      severity: 'critical',
    })
    cap = Math.min(cap, 15)
  }

  const healthIns = input.debtors?.entries.find((e) =>
    ['vszp', 'dovera', 'union'].includes(e.source)
  )
  if (healthIns) {
    flags.push({
      source: healthIns.source,
      code: 'HEALTH_INS_DEBT',
      message: `Health insurance debt (${healthIns.source})`,
      severity: 'high',
    })
    score -= 20
  }

  if (input.vat?.unreliable) {
    flags.push({ source: 'fs', code: 'VAT_UNRELIABLE', message: 'Unreliable VAT payer', severity: 'high' })
    score -= 25
  }

  const ageYears = yearsBetween(input.company.founded, input.now)
  if (ageYears !== null) {
    if (ageYears < 1) {
      flags.push({ source: 'orsf', code: 'YOUNG_COMPANY', message: 'Less than 1 year old', severity: 'high' })
      score -= 15
    } else if (ageYears < 3) {
      flags.push({ source: 'orsf', code: 'YOUNGISH', message: 'Less than 3 years old', severity: 'medium' })
      score -= 10
    } else if (ageYears >= 10) {
      flags.push({ source: 'orsf', code: 'TENURED', message: '10+ years active', severity: 'low' })
      score += 5
    }
  }

  if (!input.debtors || input.debtors.entries.length === 0) {
    flags.push({ source: 'debtors', code: 'CLEAN_DEBTORS', message: 'Clean debtor lists', severity: 'low' })
    score += 5
  }

  score = Math.min(score, cap)
  score = Math.max(0, Math.min(100, score))
  return { score, flags }
}

async function gather(
  ico: string,
  opts?: RequestOptions
): Promise<{
  company: SKCompanyInfo
  insolvency: SKInsolvencyResult
  vat: SKVatInfo | null
  debtors: SKDebtorResult | null
}> {
  const [companyRes, insolvencyRes, vatRes, debtorsRes] = await Promise.allSettled([
    company.lookup(ico, opts),
    insolvency.check(ico, opts),
    vat.check(ico, opts),
    debtors.check(ico, opts),
  ])
  if (companyRes.status === 'rejected') throw companyRes.reason
  return {
    company: companyRes.value,
    insolvency:
      insolvencyRes.status === 'fulfilled'
        ? insolvencyRes.value
        : { ico, insolvent: false, count: 0, proceedings: [] },
    vat: vatRes.status === 'fulfilled' ? vatRes.value : null,
    debtors: debtorsRes.status === 'fulfilled' ? debtorsRes.value : null,
  }
}

export const risk = {
  async assess(ico: string, opts?: RequestOptions): Promise<SKRiskReport> {
    const valid = assertValidICO(ico)
    const sources = await gather(valid, opts)
    const now = new Date()
    const { score, flags } = computeScore({ ...sources, now })
    return {
      ico: valid,
      name: sources.company.name,
      score,
      level: levelFromScore(score),
      flags,
      company: sources.company,
      insolvency: sources.insolvency,
      vat: sources.vat,
      debtors: sources.debtors,
      checkedAt: now.toISOString(),
    }
  },
}
