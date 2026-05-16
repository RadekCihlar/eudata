import type { GeoPoint, RequestOptions } from 'eudata-common'

export type { GeoPoint, RequestOptions }

export interface PLAddress {
  formatted: string
  street: string | null
  buildingNumber: string | null
  apartmentNumber: string | null
  city: string | null
  postalCode: string | null
  voivodeship: string | null
  country: string
}

export interface PLPKDCode {
  code: string
  description: string
  primary: boolean
}

export interface PLDirector {
  name: string
  role: string
  since: string | null
  krsEntryNumber: string | null
}

export interface PLBoardMember {
  name: string
  role: string
  since: string | null
}

export interface PLShareholder {
  name: string
  type: 'person' | 'company'
  nip: string | null
  shares: number | null
  shareValue: number | null
  percentage: string | null
}

export interface PLCompanyInfo {
  krs: string
  nip: string
  regon: string
  name: string
  address: PLAddress
  legalForm: string
  founded: string | null
  registered: string | null
  dissolved: string | null
  active: boolean
  shareCapital: number | null
  currency: string
  pkdCodes: PLPKDCode[]
  court: string
  directors: PLDirector[]
  supervisoryBoard: PLBoardMember[]
  status: 'active' | 'dissolved' | 'in_liquidation' | 'in_bankruptcy' | 'unknown'
  _raw: unknown
}

export interface PLSoleTrader {
  name: string
  ownerName: string
  nip: string
  regon: string
  address: PLAddress
  mailingAddress: PLAddress | null
  status: 'active' | 'suspended' | 'ceased' | 'deleted' | 'unknown'
  startDate: string
  endDate: string | null
  suspendedFrom: string | null
  suspendedTo: string | null
  pkdCodes: PLPKDCode[]
  communityProperty: boolean
  hasPartners: boolean
  _raw: unknown
}

export interface PLRegisterChange {
  date: string
  type: string
  description: string
}

export interface PLVatInfo {
  nip: string
  name: string
  status: 'active' | 'exempt' | 'deregistered' | 'not_registered' | 'unknown'
  regon: string | null
  krs: string | null
  registeredBankAccounts: string[]
  address: string
  registrationDate: string | null
  deregistrationDate: string | null
  restorationDate: string | null
  hasVirtualAccount: boolean
}

export interface PLRegonEntity {
  regon: string
  nip: string
  name: string
  province: string
  district: string
  commune: string
  city: string
  postalCode: string
  street: string
  houseNumber: string
  type: 'legal_person' | 'natural_person' | 'local_unit' | 'unknown'
  pkdMain: PLPKDCode | null
  registrationDate: string
  status: 'active' | 'inactive' | 'unknown'
}

export interface PLRegonFullReport {
  entity: PLRegonEntity
  branches: PLRegonEntity[]
  allPKDCodes: PLPKDCode[]
  employeeCountRange: string
  legalForm: string
  ownershipForm: string
  foundingDate: string
}

export interface PLBeneficialOwner {
  firstName: string
  lastName: string
  nationality: string
  countryOfResidence: string
  ownershipPercentage: number | null
  controlType: 'direct' | 'indirect' | 'other'
  registeredSince: string
}

export interface PLInsolvencyProceeding {
  court: string
  fileReference: string
  type: 'bankruptcy' | 'restructuring' | 'consumer_bankruptcy' | 'enforcement' | 'unknown'
  status: 'active' | 'completed' | 'dismissed' | 'unknown'
  startDate: string
  administrator: string | null
}

export interface PLInsolvencyResult {
  query: string
  insolvent: boolean
  count: number
  proceedings: PLInsolvencyProceeding[]
}

export interface PLFinancialStatement {
  krs: string
  year: number
  format: 'xml_pas' | 'xhtml_ifrs' | 'unknown'
  totalAssets: number | null
  equity: number | null
  revenue: number | null
  netProfit: number | null
  filedDate: string
  documentUrl: string
  standard: 'PAS' | 'IFRS' | 'unknown'
}

export type PLRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface PLRiskFlag {
  source: string
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface PLRiskReport {
  nip: string
  name: string
  score: number
  level: PLRiskLevel
  flags: PLRiskFlag[]
  company: PLCompanyInfo | null
  soleTrader: PLSoleTrader | null
  vat: PLVatInfo | null
  insolvency: PLInsolvencyResult | null
  checkedAt: string
}

export interface PLSearchOptions extends RequestOptions {
  limit?: number
  activeOnly?: boolean
}

export interface PLSanctionsEntry {
  id: string
  name: string
  aliases: string[]
  reason: string
  designationDate: string
}
