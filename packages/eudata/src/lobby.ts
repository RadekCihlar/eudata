import { HttpError } from 'eudata-common'
import type { RequestOptions } from './types.js'

/**
 * EU Transparency Register (transparency-register.europa.eu).
 *
 * As of 2026-05, the rebranded portal exposes search only via the EU
 * Commission internal search-api (api.tech.ec.europa.eu) which requires
 * a per-consumer apiKey not granted to public clients. Bulk XML
 * downloads (formerly at ec.europa.eu/transparencyregister/public/openFile.do)
 * also return 404 since the rebrand.
 *
 * Module shape is kept so callers can adopt it once EU publishes a
 * stable public REST endpoint. lookup() currently throws.
 */

export interface LobbyEntity {
  id: string
  name: string
  acronym: string | null
  category: string | null
  headOffice: string | null
  country: string | null
  website: string | null
  registrationDate: string | null
  members: number | null
  fteEquivalent: number | null
  budget: number | null
  url: string
}

export interface LobbySearchOptions extends RequestOptions {
  query?: string
  country?: string
  category?: string
  limit?: number
}

export const lobby = {
  async search(_opts: LobbySearchOptions = {}): Promise<{ entities: LobbyEntity[]; total: number }> {
    throw new HttpError(
      'EU Transparency Register has no public REST API after the 2024 rebrand to transparency-register.europa.eu. ' +
      'Search is gated behind the internal EU Commission search-api with an unpublished consumer key. ' +
      'Bulk XML download endpoints also return 404. Module kept as a stub for when EU exposes a stable JSON endpoint.',
      { source: 'eu:lobby', url: 'https://transparency-register.europa.eu/', status: 501 }
    )
  },
}
