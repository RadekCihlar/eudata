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

export interface Lien {
  type: string
  holder: string
  registeredDate: string
  description: string
}

export interface ParcelInfo {
  cadastralArea: string
  parcelNumber: string
  area: number
  landType: string
  owner: string
  ownerType: 'person' | 'company' | 'state' | 'municipality' | 'unknown'
  liens: Lien[]
}

export interface BuildingInfo {
  address: string
  buildingType: string
  builtYear: number | null
  floors: number | null
  units: number | null
  parcelNumber: string
  owner: string
}

export interface OwnershipInfo {
  propertyId: string
  owners: Array<{
    name: string
    share: string
    type: 'person' | 'company'
    ico?: string
  }>
  transferHistory: Array<{
    date: string
    from: string
    to: string
    type: string
  }>
}

export interface PropertySummary {
  propertyId: string
  cadastralArea: string
  parcelNumber: string
  type: string
}

export interface Tender {
  id: string
  title: string
  contractingAuthority: { name: string; ico: string }
  estimatedValue: number | null
  currency: string
  publishDate: string
  deadline: string | null
  status: 'open' | 'closed' | 'awarded' | 'cancelled' | 'unknown'
  cpvCodes: string[]
  winner?: { name: string; ico: string; awardedValue: number }
}

export interface TenderSearchOptions extends RequestOptions {
  limit?: number
  status?: 'open' | 'closed' | 'awarded'
  minValue?: number
  maxValue?: number
  cpvCode?: string
  region?: string
  dateFrom?: string
  dateTo?: string
}

export interface TenderAnomaly {
  type: 'single_bidder' | 'just_under_threshold' | 'repeat_winner' | 'rushed_deadline' | 'price_anomaly'
  tenderId: string
  description: string
  severity: 'info' | 'warning' | 'suspicious'
}

export interface AirQuality {
  station: string
  location: GeoPoint
  index: number
  level: 'good' | 'fair' | 'moderate' | 'poor' | 'bad' | 'very_bad' | 'unknown'
  pollutants: {
    pm25: number | null
    pm10: number | null
    o3: number | null
    no2: number | null
    so2: number | null
  }
  measuredAt: string
}

export interface WeatherCurrent {
  station: string
  temperature: number | null
  humidity: number | null
  pressure: number | null
  windSpeed: number | null
  measuredAt: string
}

export interface WeatherWarning {
  type: string
  severity: 'yellow' | 'orange' | 'red'
  regions: string[]
  validFrom: string
  validTo: string
  description: string
}

export interface WaterLevel {
  station: string
  river: string
  level: number
  flow: number | null
  trend: 'rising' | 'falling' | 'steady'
  measuredAt: string
}

export interface FoodAlert {
  id: string
  title: string
  type: 'alert' | 'border_rejection' | 'information' | 'news'
  product: string
  category: string
  hazard: string
  origin: string
  distributedTo: string[]
  date: string
  notifiedBy: string
}

export interface FoodSearchOptions extends RequestOptions {
  limit?: number
  fromDate?: string
  toDate?: string
}

export interface EmissionReport {
  facility: string
  ico: string
  location: GeoPoint
  year: number
  emissions: Array<{
    substance: string
    amount: number
    unit: string
    medium: 'air' | 'water' | 'soil'
  }>
}

export interface Violation {
  company: string
  ico: string | null
  date: string
  type: string
  description: string
  fine: number | null
  resolution: string
}

export interface Polluter {
  facility: string
  ico: string
  location: GeoPoint
  distanceKm: number
  pollutants: string[]
}
