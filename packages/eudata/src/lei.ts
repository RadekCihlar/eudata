import { fetchJSON } from 'eudata-common'
import type { LEIAddress, LEIRecord, LEIRelationship, RequestOptions } from './types.js'

const GLEIF_BASE = 'https://api.gleif.org/api/v1'

interface GleifAddressRaw {
  addressLines?: string[]
  city?: string
  region?: string | null
  country?: string
  postalCode?: string | null
}

interface GleifEntityAttrs {
  lei?: string
  entity?: {
    legalName?: { name?: string }
    legalAddress?: GleifAddressRaw
    headquartersAddress?: GleifAddressRaw
    jurisdiction?: string
    legalForm?: { id?: string; other?: string }
    status?: string
  }
  registration?: {
    initialRegistrationDate?: string
    nextRenewalDate?: string
    managingLou?: string
  }
}

interface GleifRecord {
  id?: string
  attributes?: GleifEntityAttrs
}

function mapAddress(a: GleifAddressRaw | undefined): LEIAddress {
  const lines = a?.addressLines ?? []
  return {
    line1: lines[0] ?? '',
    city: a?.city ?? '',
    region: a?.region ?? null,
    country: a?.country ?? '',
    postalCode: a?.postalCode ?? null,
  }
}

function mapStatus(s: string | undefined): LEIRecord['status'] {
  const lower = (s ?? '').toLowerCase()
  if (lower === 'active' || lower === 'issued') return 'active'
  if (lower === 'lapsed') return 'lapsed'
  if (lower === 'retired') return 'retired'
  if (lower === 'merged') return 'merged'
  return 'unknown'
}

function mapRecord(rec: GleifRecord): LEIRecord {
  const a = rec.attributes ?? {}
  const e = a.entity ?? {}
  const r = a.registration ?? {}
  return {
    lei: a.lei ?? rec.id ?? '',
    name: e.legalName?.name ?? '',
    legalAddress: mapAddress(e.legalAddress),
    headquartersAddress: mapAddress(e.headquartersAddress),
    jurisdiction: e.jurisdiction ?? '',
    legalForm: e.legalForm?.id ?? e.legalForm?.other ?? '',
    status: mapStatus(e.status),
    registrationDate: r.initialRegistrationDate ?? '',
    nextRenewalDate: r.nextRenewalDate ?? '',
    managingLOU: r.managingLou ?? '',
  }
}

const JURISDICTION_MAP: Record<string, string> = {
  CZ: 'CZ',
  SK: 'SK',
  PL: 'PL',
}

export const lei = {
  async lookup(leiCode: string, opts?: RequestOptions): Promise<LEIRecord> {
    const url = `${GLEIF_BASE}/lei-records/${encodeURIComponent(leiCode)}`
    const res = await fetchJSON<{ data?: GleifRecord }>(url, {
      ...(opts ?? {}),
      source: 'eu:gleif',
    })
    if (!res.data) throw new Error(`LEI not found: ${leiCode}`)
    return mapRecord(res.data)
  },

  async search(name: string, opts?: RequestOptions): Promise<LEIRecord[]> {
    const url = `${GLEIF_BASE}/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}`
    const res = await fetchJSON<{ data?: GleifRecord[] }>(url, {
      ...(opts ?? {}),
      source: 'eu:gleif',
    })
    return (res.data ?? []).map(mapRecord)
  },

  async relationships(leiCode: string, opts?: RequestOptions): Promise<LEIRelationship[]> {
    const out: LEIRelationship[] = []
    interface RelData {
      data?: {
        attributes?: {
          relationship?: {
            startNode?: { id?: string }
            endNode?: { id?: string; name?: string }
            relationshipType?: string
            registrationDate?: string
          }
        }
      }
    }
    for (const kind of ['direct-parent', 'ultimate-parent'] as const) {
      try {
        const url = `${GLEIF_BASE}/lei-records/${encodeURIComponent(leiCode)}/${kind}-relationship`
        const res = await fetchJSON<RelData>(url, { ...(opts ?? {}), source: 'eu:gleif' })
        const rel = res.data?.attributes?.relationship
        if (rel?.endNode?.id) {
          out.push({
            type: kind === 'direct-parent' ? 'direct_parent' : 'ultimate_parent',
            relatedLEI: rel.endNode.id,
            relatedName: rel.endNode.name ?? '',
            relationshipDate: rel.registrationDate ?? '',
          })
        }
      } catch {
        /* relationship may not exist */
      }
    }
    return out
  },

  async findByNationalId(
    country: string,
    nationalId: string,
    opts?: RequestOptions
  ): Promise<LEIRecord | null> {
    const jurisdiction = JURISDICTION_MAP[country.toUpperCase()] ?? country.toUpperCase()
    const url = `${GLEIF_BASE}/lei-records?filter[entity.jurisdiction]=${jurisdiction}&filter[registration.registrationAuthorityEntityID]=${encodeURIComponent(nationalId)}`
    const res = await fetchJSON<{ data?: GleifRecord[] }>(url, {
      ...(opts ?? {}),
      source: 'eu:gleif',
    })
    if (!res.data || res.data.length === 0) return null
    return mapRecord(res.data[0]!)
  },
}
