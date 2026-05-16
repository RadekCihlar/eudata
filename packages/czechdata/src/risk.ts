import { company } from './company.js'
import { insolvency } from './insolvency.js'
import { vat } from './vat.js'
import type {
  CompanyInfo,
  InsolvencyResult,
  QuickRisk,
  RequestOptions,
  RiskFlag,
  RiskLevel,
  RiskReport,
  VatInfo,
} from './types.js'
import { assertValidICO } from './utils.js'

function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'low'
  if (score >= 60) return 'medium'
  if (score >= 30) return 'high'
  return 'critical'
}

function flag(
  source: string,
  code: string,
  message: string,
  severity: RiskFlag['severity'],
  detail?: string
): RiskFlag {
  return detail !== undefined ? { source, code, message, severity, detail } : { source, code, message, severity }
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
  company: CompanyInfo
  insolvency: InsolvencyResult
  vat: VatInfo | null
  now: Date
}

function computeScore(input: ScoreInput): { score: number; flags: RiskFlag[] } {
  const flags: RiskFlag[] = []
  let score = 100
  let criticalCap = Infinity

  if (!input.company.active && input.company.dissolved) {
    flags.push(flag('ares', 'DISSOLVED', 'Company dissolved', 'critical', input.company.dissolved))
    criticalCap = Math.min(criticalCap, 5)
  }

  if (input.insolvency.insolvent) {
    flags.push(flag('isir', 'INSOLVENCY_ACTIVE', 'Active insolvency proceeding', 'critical'))
    criticalCap = Math.min(criticalCap, 10)
  }

  if (input.vat?.unreliable) {
    flags.push(flag('vat', 'VAT_UNRELIABLE', 'Unreliable VAT payer', 'critical'))
    criticalCap = Math.min(criticalCap, 20)
  }

  const ageYears = yearsBetween(input.company.founded, input.now)
  if (ageYears !== null) {
    if (ageYears < 1) {
      flags.push(flag('ares', 'YOUNG_COMPANY', 'Less than 1 year old', 'high'))
      score -= 15
    } else if (ageYears < 3) {
      flags.push(flag('ares', 'YOUNGISH_COMPANY', 'Less than 3 years old', 'medium'))
      score -= 10
    } else if (ageYears >= 10) {
      flags.push(flag('ares', 'TENURED', '10+ years active', 'low'))
      score += 5
    }
  }

  if (input.company.legalForm === 'sro' && !input.vat?.vatPayer) {
    flags.push(flag('vat', 'NO_VAT_REG', 'No VAT registration', 'high'))
    score -= 15
  }

  if (input.insolvency.proceedings.length === 0) {
    flags.push(flag('isir', 'CLEAN_INSOLVENCY', 'No insolvency proceedings', 'low'))
    score += 3
  }

  score = Math.min(score, criticalCap)
  score = Math.max(0, Math.min(100, score))
  return { score, flags }
}

function topFlagMessage(flags: RiskFlag[]): string | null {
  const order: RiskFlag['severity'][] = ['critical', 'high', 'medium', 'low']
  for (const sev of order) {
    const f = flags.find((x) => x.severity === sev)
    if (f) return f.message
  }
  return null
}

async function gatherSources(
  ico: string,
  opts?: RequestOptions
): Promise<{ company: CompanyInfo; insolvency: InsolvencyResult; vat: VatInfo | null }> {
  const [companyRes, insolvencyRes, vatRes] = await Promise.allSettled([
    company.lookup(ico, opts),
    insolvency.check(ico, opts),
    vat.check(ico, opts),
  ])
  if (companyRes.status === 'rejected') throw companyRes.reason
  return {
    company: companyRes.value,
    insolvency:
      insolvencyRes.status === 'fulfilled'
        ? insolvencyRes.value
        : { query: ico, count: 0, proceedings: [], insolvent: false },
    vat: vatRes.status === 'fulfilled' ? vatRes.value : null,
  }
}

export const risk = {
  async assess(ico: string, opts?: RequestOptions): Promise<RiskReport> {
    const valid = assertValidICO(ico)
    const sources = await gatherSources(valid, opts)
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
      checkedAt: now.toISOString(),
    }
  },

  async quick(ico: string, opts?: RequestOptions): Promise<QuickRisk> {
    const report = await risk.assess(ico, opts)
    return {
      ico: report.ico,
      name: report.name,
      score: report.score,
      level: report.level,
      flagCount: report.flags.length,
      topFlag: topFlagMessage(report.flags),
    }
  },

  async batch(icos: string[], opts?: RequestOptions): Promise<RiskReport[]> {
    return Promise.all(icos.map((ico) => risk.assess(ico, opts)))
  },
}
