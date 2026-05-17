import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const OPENAIRE_PUBLICATIONS = 'https://api.openaire.eu/search/publications'

export interface OpenairePublication {
  id: string
  title: string | null
  doi: string | null
  publicationYear: number | null
  publisher: string | null
  type: string | null
  openAccess: boolean
  authors: string[]
  url: string | null
}

export interface OpenaireSearchOptions extends RequestOptions {
  query?: string
  doi?: string
  author?: string
  country?: string
  fromYear?: number
  toYear?: number
  limit?: number
  page?: number
}

interface OaPubsResponse {
  response?: {
    results?: { result?: OaPubResult[] | OaPubResult }
    header?: { total?: { $?: number } }
  }
}

interface OaPubResult {
  metadata?: {
    'oaf:entity'?: {
      'oaf:result'?: OaResult | OaResult[]
    }
  }
}

interface OaResult {
  title?: ScalarOrObj | ScalarOrObj[]
  pid?: Array<{ $?: string; classid?: string }> | { $?: string; classid?: string }
  dateofacceptance?: ScalarOrObj
  publisher?: ScalarOrObj
  resulttype?: ScalarOrObj
  bestaccessright?: { classid?: string }
  creator?: ScalarOrObj | ScalarOrObj[]
  children?: { instance?: Array<{ webresource?: { url?: ScalarOrObj } | Array<{ url?: ScalarOrObj }> }> }
}

type ScalarOrObj = string | number | { $?: string | number; classid?: string }

function scalar(v: ScalarOrObj | undefined): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && '$' in v && v.$ !== undefined) return String(v.$)
  return null
}

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function firstUrl(p: OaResult): string | null {
  const instances = arr(p.children?.instance)
  for (const inst of instances) {
    const webresource = inst.webresource
    if (Array.isArray(webresource)) {
      for (const w of webresource) {
        const u = scalar(w.url)
        if (u) return u
      }
    } else if (webresource) {
      const u = scalar(webresource.url)
      if (u) return u
    }
  }
  return null
}

function mapPub(p: OaResult): OpenairePublication {
  const pids = arr(p.pid)
  const doi = pids.find((x) => x.classid === 'doi')?.$ ?? null
  const dateStr = scalar(p.dateofacceptance)
  const year = dateStr ? Number(dateStr.slice(0, 4)) : null
  const titles = arr(p.title)
  const firstTitle = titles.length ? scalar(titles[0]) : null
  const creators = arr(p.creator).map((c) => scalar(c) ?? '').filter(Boolean)
  return {
    id: doi ? `doi:${doi}` : (firstTitle ?? ''),
    title: firstTitle,
    doi: typeof doi === 'string' ? doi : null,
    publicationYear: Number.isFinite(year) ? (year as number) : null,
    publisher: scalar(p.publisher),
    type: scalar(p.resulttype),
    openAccess: p.bestaccessright?.classid === 'OPEN',
    authors: creators,
    url: firstUrl(p),
  }
}

export const openaire = {
  async search(opts: OpenaireSearchOptions = {}): Promise<{ publications: OpenairePublication[]; total: number }> {
    const params = new URLSearchParams({ format: 'json', size: String(opts.limit ?? 10), page: String(opts.page ?? 1) })
    if (opts.query) params.set('keywords', opts.query)
    if (opts.doi) params.set('doi', opts.doi)
    if (opts.author) params.set('author', opts.author)
    if (opts.country) params.set('countryCode', opts.country.toUpperCase())
    if (opts.fromYear) params.set('fromDateAccepted', `${opts.fromYear}-01-01`)
    if (opts.toYear) params.set('toDateAccepted', `${opts.toYear}-12-31`)

    const url = `${OPENAIRE_PUBLICATIONS}?${params.toString()}`
    const res = await fetchJSON<OaPubsResponse>(url, { ...opts, source: 'eu:openaire' })
    const results = arr(res.response?.results?.result)
    const publications: OpenairePublication[] = []
    for (const r of results) {
      for (const p of arr(r.metadata?.['oaf:entity']?.['oaf:result'])) publications.push(mapPub(p))
    }
    return { publications, total: res.response?.header?.total?.$ ?? publications.length }
  },
}
