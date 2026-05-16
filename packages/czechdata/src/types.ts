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

export interface ExecutionProceeding {
  executor: string
  fileReference: string
  startDate: string | null
  status: 'active' | 'completed' | 'stopped' | 'unknown'
  court: string | null
}

export interface ExecutionResult {
  query: string
  hasActiveExecutions: boolean
  count: number
  proceedings: ExecutionProceeding[]
}

export interface TradeLicense {
  type: 'volna' | 'vazana' | 'remeslna' | 'koncesovana' | 'unknown'
  name: string
  validFrom: string | null
  validTo: string | null
  suspended: boolean
}

export interface TradeLicenseInfo {
  ico: string
  name: string
  licenses: TradeLicense[]
  hasActiveLicense: boolean
}

export interface VinDecoded {
  vin: string
  make: string
  model: string
  year: number | null
  bodyType: string
  engineType: string
  engineDisplacement: string
  fuelType: string
  transmission: string
  driveType: string
  doors: number | null
  plantCountry: string
  plantCity: string | null
  vehicleType: string
  _raw: unknown
}

export interface VinRecall {
  campaignNumber: string
  date: string
  component: string
  summary: string
  consequence: string
  remedy: string
}

export type RecallCategory =
  | 'toys'
  | 'motor_vehicles'
  | 'electrical'
  | 'cosmetics'
  | 'food'
  | 'clothing'
  | 'furniture'
  | 'chemicals'
  | 'other'

export interface ProductRecall {
  id: string
  title: string
  description: string
  category: RecallCategory
  brand: string
  product: string
  risk: string
  measures: string
  notifyingCountry: string
  publishDate: string
  imageUrl: string | null
}

export interface BatchOptions extends RequestOptions {
  concurrency?: number
  onProgress?: (done: number, total: number) => void
  continueOnError?: boolean
}

export interface ChangeReport {
  ico: string
  changes: Array<{
    field: string
    oldValue: unknown
    newValue: unknown
    detectedAt: string
  }>
}

export interface Defect {
  code: string | null
  severity: 'minor' | 'major' | 'critical'
  description: string
}

export interface InspectionRecord {
  date: string
  type: 'STK' | 'emission' | 'other'
  result: 'pass' | 'fail' | 'conditional' | 'unknown'
  mileageKm: number | null
  station: string | null
  defects: Defect[]
}

export interface VehicleInfo {
  plate: string
  vin: string | null
  stkExpiry: string | null
  emissionExpiry: string | null
  inspections: InspectionRecord[]
}

export interface OdometerAnomaly {
  type: 'rollback' | 'gap' | 'excessive_daily_average'
  fromDate: string
  toDate: string
  fromKm: number
  toKm: number
  message: string
}

export interface OdometerReport {
  plate: string
  readings: Array<{ date: string; km: number }>
  anomalies: OdometerAnomaly[]
  suspicious: boolean
}

export interface Director {
  name: string
  role: string
  since: string | null
  until: string | null
  address: string | null
}

export interface Shareholder {
  name: string
  type: 'person' | 'company'
  ico: string | null
  share: string | null
}

export interface CommercialRegisterEntry {
  ico: string
  name: string
  registeredAt: string
  section: string
  fileNumber: string
  registeredCapital: number | null
  directors: Director[]
  shareholders: Shareholder[]
}

export interface CourtDecision {
  court: string
  fileReference: string
  date: string
  type: string
  summary: string
}

export interface FullAddress {
  addressCode: string
  street: string | null
  houseNumber: string
  orientationNumber: string | null
  municipality: string
  municipalityPart: string | null
  district: string | null
  region: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  formatted: string
}

export interface AddressSuggestion {
  addressCode: string
  formatted: string
}

export interface AddressValidation {
  valid: boolean
  normalized: FullAddress | null
  suggestions: AddressSuggestion[]
  confidence: number
}

export interface MunicipalityInfo {
  code: string
  name: string
  district: string | null
  region: string | null
  population: number | null
}

export interface BudgetCategory {
  code: string
  name: string
  planned: number
  actual: number
  percentUsed: number
}

export interface MunicipalBudget {
  ico: string
  name: string
  year: number
  income: { planned: number; actual: number; categories: BudgetCategory[] }
  expenses: { planned: number; actual: number; categories: BudgetCategory[] }
  balance: number
  debtTotal: number
}

export interface StateBudget extends MunicipalBudget {}

export interface BudgetOrg {
  ico: string
  name: string
  type: string
}

export interface BudgetComparison {
  ico: string
  name: string
  years: number[]
  incomeByYear: Record<number, number>
  expensesByYear: Record<number, number>
  debtByYear: Record<number, number>
}
