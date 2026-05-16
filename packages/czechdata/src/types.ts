import type { GeoPoint, RequestOptions } from 'eudata-common'

export type { RequestOptions, GeoPoint }

export type LegalForm =
  | 'sole_trader'
  | 'sro'
  | 'as'
  | 'vos'
  | 'ks'
  | 'cooperative'
  | 'state_org'
  | 'municipality'
  | 'foundation'
  | 'association'
  | 'foreign_branch'
  | 'other'

export interface CompanyAddress {
  formatted: string
  street: string | null
  houseNumber: string | null
  orientationNumber: string | null
  city: string | null
  cityPart: string | null
  district: string | null
  region: string | null
  postalCode: string | null
  country: string
  ruianAddressCode: string | null
}

export interface CompanyInfo {
  ico: string
  name: string
  address: CompanyAddress
  legalForm: LegalForm
  legalFormCode: string | null
  founded: string | null
  dissolved: string | null
  active: boolean
  vatId: string | null
  naceCodes: string[]
  registrations: Record<string, string>
  _raw: unknown
}

export interface SearchOptions extends RequestOptions {
  limit?: number
  legalForm?: LegalForm
  activeOnly?: boolean
  region?: string
}

export interface InsolvencyProceeding {
  personId: string
  type: string
  status: 'active' | 'resolved' | 'dismissed' | 'unknown'
  startDate: string | null
  fileReference: string
}

export interface InsolvencyResult {
  query: string
  count: number
  proceedings: InsolvencyProceeding[]
  insolvent: boolean
}

export interface InsolvencyDetail extends InsolvencyProceeding {
  events: InsolvencyEvent[]
}

export interface InsolvencyEvent {
  date: string
  type: string
  description: string
}

export interface BankAccount {
  iban: string | null
  accountNumber: string
  bankCode: string
  publishedAt: string | null
}

export interface VatInfo {
  query: string
  ico: string | null
  dic: string | null
  vatPayer: boolean
  registeredSince: string | null
  unreliable: boolean
  unreliableSince: string | null
  bankAccounts: BankAccount[]
}

export interface UnreliableEntry {
  dic: string
  unreliableSince: string
  reason: string | null
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskFlag {
  source: string
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detail?: string
}

export interface RiskReport {
  ico: string
  name: string
  score: number
  level: RiskLevel
  flags: RiskFlag[]
  company: CompanyInfo
  insolvency: InsolvencyResult
  vat: VatInfo | null
  checkedAt: string
}

export interface QuickRisk {
  ico: string
  name: string
  score: number
  level: RiskLevel
  flagCount: number
  topFlag: string | null
}
