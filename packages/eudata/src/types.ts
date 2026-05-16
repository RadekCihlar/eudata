import type { GeoPoint, RequestOptions } from 'eudata-common'

export type { GeoPoint, RequestOptions }

export type CountryCode = 'CZ' | 'SK' | 'PL'

export interface VIESResult {
  vatNumber: string
  countryCode: string
  valid: boolean
  name: string | null
  address: string | null
  requestDate: string
}

export interface VIESConfirmation extends VIESResult {
  requesterVat: string
  consultationNumber: string
}

export interface SanctionsMatch {
  entityId: string
  name: string
  aliases: string[]
  type: 'person' | 'entity'
  program: string
  designationDate: string
  reason: string
  score: number
}

export interface SanctionsResult {
  query: string
  matched: boolean
  matches: SanctionsMatch[]
}

export interface SanctionedEntity {
  entityId: string
  name: string
  aliases: string[]
  type: 'person' | 'entity'
  program: string
  designationDate: string
  reason: string
  birthDate?: string
  nationality?: string
}

export interface LEIAddress {
  line1: string
  city: string
  region: string | null
  country: string
  postalCode: string | null
}

export interface LEIRecord {
  lei: string
  name: string
  legalAddress: LEIAddress
  headquartersAddress: LEIAddress
  jurisdiction: string
  legalForm: string
  status: 'active' | 'lapsed' | 'retired' | 'merged' | 'unknown'
  registrationDate: string
  nextRenewalDate: string
  managingLOU: string
}

export interface LEIRelationship {
  type: 'direct_parent' | 'ultimate_parent'
  relatedLEI: string
  relatedName: string
  relationshipDate: string
}

export interface EURiskFlag {
  source: string
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface MultiCountryQuery {
  country: CountryCode
  id: string
}

export interface SanctionsOptions extends RequestOptions {
  threshold?: number
}
