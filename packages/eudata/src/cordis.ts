import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const OPENAIRE_PROJECTS = 'https://api.openaire.eu/search/projects'

export interface CordisProject {
  id: string
  code: string | null
  acronym: string | null
  title: string | null
  startDate: string | null
  endDate: string | null
  fundingScheme: string | null
  funder: string | null
  totalCost: number | null
  ecContribution: number | null
  coordinator: string | null
  participants: string[]
  url: string | null
}

export interface CordisSearchOptions extends RequestOptions {
  query?: string
  funder?: string
  country?: string
  limit?: number
  page?: number
}

interface OaResponse {
  response?: {
    results?: {
      result?: OaResult[] | OaResult
    }
    header?: { total?: { $?: number } }
  }
}

interface OaResult {
  metadata?: {
    'oaf:entity'?: {
      'oaf:project'?: OaProject | OaProject[]
    }
  }
}

interface OaProject {
  code?: ScalarOrObj
  acronym?: ScalarOrObj
  title?: ScalarOrObj
  startdate?: ScalarOrObj
  enddate?: ScalarOrObj
  fundingtree?: { funding_level_0?: { name?: ScalarOrObj }; funder?: { name?: ScalarOrObj; shortname?: ScalarOrObj } }
  totalcost?: ScalarOrObj
  fundedamount?: ScalarOrObj
  websiteurl?: ScalarOrObj
  rels?: { rel?: OaRel[] | OaRel }
}

type ScalarOrObj = string | number | { $?: string | number; classid?: string }

interface OaRel {
  to?: { class?: string }
  legalname?: ScalarOrObj
}

function scalar(v: ScalarOrObj | undefined): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && '$' in v && v.$ !== undefined) return String(v.$)
  return null
}

function num(v: ScalarOrObj | undefined): number | null {
  const s = scalar(v)
  if (s === null) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function arrayify<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function mapProject(p: OaProject): CordisProject {
  const rels = arrayify(p.rels?.rel)
  const coord = rels.find((r) => r.to?.class === 'isCoordinatorOf' || r.to?.class === 'hasCoordinator')
  const parts = rels
    .filter((r) => r.to?.class === 'isParticipant' || r.to?.class === 'hasParticipant')
    .map((r) => scalar(r.legalname) ?? '')
    .filter(Boolean)
  const code = scalar(p.code)
  return {
    id: code ?? '',
    code,
    acronym: scalar(p.acronym),
    title: scalar(p.title),
    startDate: scalar(p.startdate),
    endDate: scalar(p.enddate),
    fundingScheme: scalar(p.fundingtree?.funding_level_0?.name),
    funder: scalar(p.fundingtree?.funder?.shortname) ?? scalar(p.fundingtree?.funder?.name),
    totalCost: num(p.totalcost),
    ecContribution: num(p.fundedamount),
    coordinator: scalar(coord?.legalname),
    participants: parts,
    url: scalar(p.websiteurl),
  }
}

export const cordis = {
  async search(opts: CordisSearchOptions = {}): Promise<{ projects: CordisProject[]; total: number }> {
    const params = new URLSearchParams({ format: 'json', size: String(opts.limit ?? 10), page: String(opts.page ?? 1) })
    if (opts.query) params.set('keywords', opts.query)
    if (opts.funder) params.set('funder', opts.funder)
    if (opts.country) params.set('countryCode', opts.country.toUpperCase())

    const url = `${OPENAIRE_PROJECTS}?${params.toString()}`
    const res = await fetchJSON<OaResponse>(url, { ...opts, source: 'eu:cordis' })

    const results = arrayify(res.response?.results?.result)
    const projects: CordisProject[] = []
    for (const r of results) {
      const ps = arrayify(r.metadata?.['oaf:entity']?.['oaf:project'])
      for (const p of ps) projects.push(mapProject(p))
    }
    return { projects, total: res.response?.header?.total?.$ ?? projects.length }
  },

  async byCode(code: string, opts?: RequestOptions): Promise<CordisProject | null> {
    const { projects } = await cordis.search({ ...opts, query: code, limit: 5 })
    return projects.find((p) => p.code === code) ?? projects[0] ?? null
  },
}
