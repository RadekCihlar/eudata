import type { GeoPoint, RequestOptions } from 'eudata-common'

export type { GeoPoint, RequestOptions }

export interface SKAddress {
  formatted: string
  street: string | null
  houseNumber: string | null
  city: string | null
  postalCode: string | null
  country: string
}

export interface SKDirector {
  name: string
  role: string
  since: string | null
  until: string | null
  address: string | null
}

export interface SKShareholder {
  name: string
  type: 'person' | 'company'
  ico: string | null
  share: string | null
  contribution: number | null
  paidUp: number | null
}

export interface SKCompanyInfo {
  ico: string
  name: string
  address: SKAddress
  legalForm: string
  founded: string | null
  dissolved: string | null
  active: boolean
  dic: string | null
  icDph: string | null
  skNace: string[]
  registeredCapital: number | null
  currency: string
  court: string | null
  section: string | null
  insertNumber: string | null
  directors: SKDirector[]
  _raw: unknown
}

export interface SKSearchOptions extends RequestOptions {
  limit?: number
  activeOnly?: boolean
}

export interface SKInsolvencyProceeding {
  court: string
  fileReference: string
  type: 'bankruptcy' | 'restructuring' | 'debt_discharge' | 'small_bankruptcy' | 'liquidation' | 'unknown'
  status: 'active' | 'resolved' | 'dismissed' | 'unknown'
  startDate: string | null
  administrator: string | null
  debtorName: string
}

export interface SKInsolvencyResult {
  ico: string
  insolvent: boolean
  count: number
  proceedings: SKInsolvencyProceeding[]
}

export interface SKInsolvencyDetail extends SKInsolvencyProceeding {
  events: Array<{ date: string; description: string }>
}

export interface SKBankAccount {
  iban: string
  bankCode: string | null
  publishedAt: string | null
}

export interface SKVatInfo {
  query: string
  ico: string
  dic: string | null
  icDph: string | null
  vatPayer: boolean
  registeredSince: string | null
  unreliable: boolean
  bankAccounts: SKBankAccount[]
}

export interface SKVatEntry {
  icDph: string
  ico: string
  name: string
  registeredSince: string
  unreliable: boolean
}

export type SKDebtorSource = 'social_insurance' | 'vszp' | 'dovera' | 'union'

export interface SKDebtorEntry {
  source: SKDebtorSource
  name: string
  ico: string
  amountOwed: number | null
  currency: string
  asOfDate: string
}

export interface SKDebtorResult {
  ico: string
  isDebtor: boolean
  entries: SKDebtorEntry[]
}

export interface SKDebtorLists {
  socialInsurance: SKDebtorEntry[]
  vszp: SKDebtorEntry[]
  dovera: SKDebtorEntry[]
  union: SKDebtorEntry[]
  lastUpdated: string
}

export interface SKFinancialStatement {
  ico: string
  year: number
  type: 'standard' | 'simplified' | 'consolidated' | 'unknown'
  totalAssets: number | null
  equity: number | null
  revenue: number | null
  profit: number | null
  employees: number | null
  filedDate: string
  documentUrl: string | null
}

export type SKRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface SKRiskFlag {
  source: string
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface SKCourtDecision {
  id: string
  court: string
  fileReference: string
  date: string
  type: string
  summary: string
  parties: string[]
}

export interface SKCourtDecisionDetail extends SKCourtDecision {
  textUrl: string | null
}

export interface SKContract {
  id: string
  title: string
  contractor: { name: string; ico: string }
  authority: { name: string; ico: string }
  value: number | null
  currency: string
  signedDate: string
  publishedDate: string
  type: string
  documentUrl: string
}

export interface SKTender {
  id: string
  title: string
  authority: { name: string; ico: string }
  estimatedValue: number | null
  currency: string
  publishDate: string
  deadline: string | null
  status: 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown'
  cpvCodes: string[]
  winner?: { name: string; ico: string; awardedValue: number }
}

export interface SKTradeLicense {
  type: string
  name: string
  validFrom: string | null
  validTo: string | null
}

export interface SKTradeLicenseInfo {
  ico: string
  name: string
  licenses: SKTradeLicense[]
  hasActiveLicense: boolean
}

export interface SKBeneficialOwner {
  name: string
  nationality: string
  dateOfBirth: string | null
  share: string | null
  registeredSince: string
}

export interface SKRiskReport {
  ico: string
  name: string
  score: number
  level: SKRiskLevel
  flags: SKRiskFlag[]
  company: SKCompanyInfo
  insolvency: SKInsolvencyResult
  vat: SKVatInfo | null
  debtors: SKDebtorResult | null
  checkedAt: string
}
