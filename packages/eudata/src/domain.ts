import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const RDAP_BASE = 'https://rdap.org/domain'

export interface DomainInfo {
  domain: string
  ldhName: string
  status: string[]
  registrar: string | null
  registrarUrl: string | null
  registered: string | null
  expiration: string | null
  lastChanged: string | null
  nameservers: string[]
  registrantOrg: string | null
  registrantCountry: string | null
  abuseEmail: string | null
}

interface RdapEvent {
  eventAction?: string
  eventDate?: string
}

interface RdapNameserver {
  ldhName?: string
}

interface RdapEntity {
  roles?: string[]
  publicIds?: Array<{ identifier?: string; type?: string }>
  vcardArray?: unknown[]
  entities?: RdapEntity[]
}

interface RdapResponse {
  ldhName?: string
  status?: string[]
  events?: RdapEvent[]
  nameservers?: RdapNameserver[]
  entities?: RdapEntity[]
}

function eventDate(events: RdapEvent[] | undefined, action: string): string | null {
  return events?.find((e) => e.eventAction === action)?.eventDate ?? null
}

function vcardField(vcardArray: unknown[] | undefined, field: string): string | null {
  if (!Array.isArray(vcardArray)) return null
  const entries = vcardArray[1]
  if (!Array.isArray(entries)) return null
  for (const entry of entries) {
    if (Array.isArray(entry) && entry[0] === field) {
      const val = entry[3]
      if (typeof val === 'string') return val
      if (Array.isArray(val)) return val.filter(Boolean).join(', ')
    }
  }
  return null
}

function findEntity(entities: RdapEntity[] | undefined, role: string): RdapEntity | null {
  if (!entities) return null
  for (const e of entities) {
    if (e.roles?.includes(role)) return e
    const nested = findEntity(e.entities, role)
    if (nested) return nested
  }
  return null
}

function registrarName(res: RdapResponse): string | null {
  const reg = findEntity(res.entities, 'registrar')
  if (!reg) return null
  return vcardField(reg.vcardArray, 'fn')
}

function abuseEmail(res: RdapResponse): string | null {
  const reg = findEntity(res.entities, 'registrar')
  if (!reg) return null
  const abuse = findEntity(reg.entities, 'abuse')
  if (!abuse) return null
  return vcardField(abuse.vcardArray, 'email')
}

function registrant(res: RdapResponse): { org: string | null; country: string | null } {
  const r = findEntity(res.entities, 'registrant')
  if (!r) return { org: null, country: null }
  return {
    org: vcardField(r.vcardArray, 'org') ?? vcardField(r.vcardArray, 'fn'),
    country: vcardField(r.vcardArray, 'adr'),
  }
}

export const domain = {
  async lookup(name: string, opts?: RequestOptions): Promise<DomainInfo> {
    const cleaned = name.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    const res = await fetchJSON<RdapResponse>(`${RDAP_BASE}/${encodeURIComponent(cleaned)}`, {
      ...(opts ?? {}),
      source: 'eu:rdap',
    })
    const r = registrant(res)
    return {
      domain: cleaned,
      ldhName: res.ldhName ?? cleaned,
      status: res.status ?? [],
      registrar: registrarName(res),
      registrarUrl: null,
      registered: eventDate(res.events, 'registration'),
      expiration: eventDate(res.events, 'expiration'),
      lastChanged: eventDate(res.events, 'last changed'),
      nameservers: (res.nameservers ?? []).map((n) => n.ldhName ?? '').filter(Boolean),
      registrantOrg: r.org,
      registrantCountry: r.country,
      abuseEmail: abuseEmail(res),
    }
  },
}
