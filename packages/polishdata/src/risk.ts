import { company } from './company.js'
import { soleTrader } from './sole-trader.js'
import { vat } from './vat.js'
import type {
  PLCompanyInfo,
  PLRiskFlag,
  PLRiskLevel,
  PLRiskReport,
  PLSoleTrader,
  PLVatInfo,
  RequestOptions,
} from './types.js'
import { assertValidNIP } from './utils.js'

function levelFromScore(s: number): PLRiskLevel {
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
  company: PLCompanyInfo | null
  soleTrader: PLSoleTrader | null
  vat: PLVatInfo | null
  now: Date
}

function computeScore(input: ScoreInput): { score: number; flags: PLRiskFlag[] } {
  const flags: PLRiskFlag[] = []
  let score = 100
  let cap = Infinity

  if (input.company?.status === 'in_bankruptcy') {
    flags.push({ source: 'krs', code: 'BANKRUPTCY', message: 'Active bankruptcy', severity: 'critical' })
    cap = Math.min(cap, 10)
  }

  if (input.company?.status === 'in_liquidation') {
    flags.push({ source: 'krs', code: 'LIQUIDATION', message: 'In liquidation', severity: 'critical' })
    cap = Math.min(cap, 15)
  }

  if (input.vat?.status === 'deregistered') {
    flags.push({ source: 'wl', code: 'VAT_DEREGISTERED', message: 'VAT deregistered', severity: 'critical' })
    cap = Math.min(cap, 20)
  }

  if (input.vat && input.vat.registeredBankAccounts.length === 0 && input.vat.status === 'active') {
    flags.push({
      source: 'wl',
      code: 'NO_BANK_ACCOUNTS',
      message: 'No registered bank accounts on White List',
      severity: 'high',
    })
    score -= 20
  }

  if (input.soleTrader?.status === 'suspended') {
    flags.push({
      source: 'ceidg',
      code: 'CEIDG_SUSPENDED',
      message: 'Sole trader business suspended',
      severity: 'high',
    })
    score -= 20
  }

  const founded = input.company?.founded ?? input.soleTrader?.startDate ?? null
  const ageYears = yearsBetween(founded, input.now)
  if (ageYears !== null) {
    if (ageYears < 1) {
      flags.push({ source: 'reg', code: 'YOUNG', message: 'Less than 1 year old', severity: 'high' })
      score -= 15
    } else if (ageYears < 3) {
      flags.push({ source: 'reg', code: 'YOUNGISH', message: 'Less than 3 years old', severity: 'medium' })
      score -= 10
    } else if (ageYears >= 10) {
      flags.push({ source: 'reg', code: 'TENURED', message: '10+ years active', severity: 'low' })
      score += 5
    }
  }

  if (input.vat && input.vat.registeredBankAccounts.length >= 2) {
    flags.push({ source: 'wl', code: 'MULTI_ACCOUNTS', message: 'Multiple registered bank accounts', severity: 'low' })
    score += 3
  }

  score = Math.min(score, cap)
  score = Math.max(0, Math.min(100, score))
  return { score, flags }
}

async function gather(
  nip: string,
  opts?: RequestOptions
): Promise<{
  company: PLCompanyInfo | null
  soleTrader: PLSoleTrader | null
  vat: PLVatInfo | null
}> {
  const [companyRes, soleRes, vatRes] = await Promise.allSettled([
    company.byNIP(nip, opts),
    soleTrader.byNIP(nip, opts),
    vat.check(nip, opts),
  ])
  return {
    company: companyRes.status === 'fulfilled' ? companyRes.value : null,
    soleTrader: soleRes.status === 'fulfilled' ? soleRes.value : null,
    vat: vatRes.status === 'fulfilled' ? vatRes.value : null,
  }
}

export const risk = {
  async assess(nip: string, opts?: RequestOptions): Promise<PLRiskReport> {
    const valid = assertValidNIP(nip)
    const sources = await gather(valid, opts)
    const now = new Date()
    const { score, flags } = computeScore({ ...sources, now })
    return {
      nip: valid,
      name: sources.company?.name ?? sources.soleTrader?.name ?? '',
      score,
      level: levelFromScore(score),
      flags,
      company: sources.company,
      soleTrader: sources.soleTrader,
      vat: sources.vat,
      insolvency: null,
      checkedAt: now.toISOString(),
    }
  },
}
