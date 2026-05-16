import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const OPS_BASE = 'https://ops.epo.org/3.2/rest-services'

export interface EUPatent {
  id: string
  title: string
  applicants: string[]
  inventors: string[]
  publicationDate: string
  applicationDate: string
  abstract: string
}

export interface EUPatentDetail extends EUPatent {
  claims: string
  description: string
  classifications: string[]
}

export interface PatentSearchOptions extends RequestOptions {
  accessToken: string
  limit?: number
}

interface OpsBibRow {
  publicationReference?: { documentId?: Array<{ '$': string }> }
  applicants?: { applicant?: Array<{ 'applicant-name'?: { name?: { '$': string } } }> }
  inventors?: { inventor?: Array<{ 'inventor-name'?: { name?: { '$': string } } }> }
  invention?: { title?: { '$': string } }
  abstract?: { p?: { '$': string } }
  date?: string
  applicationDate?: string
}

interface OpsResponse {
  'world-patent-data'?: {
    'biblio-search'?: {
      'search-result'?: {
        'publication-reference'?: OpsBibRow[]
      }
    }
  }
}

function mapPatent(r: OpsBibRow): EUPatent {
  const docId = r.publicationReference?.documentId?.[0]?.$ ?? ''
  return {
    id: docId,
    title: r.invention?.title?.$ ?? '',
    applicants: (r.applicants?.applicant ?? [])
      .map((a) => a['applicant-name']?.name?.$ ?? '')
      .filter(Boolean),
    inventors: (r.inventors?.inventor ?? [])
      .map((i) => i['inventor-name']?.name?.$ ?? '')
      .filter(Boolean),
    publicationDate: r.date ?? '',
    applicationDate: r.applicationDate ?? '',
    abstract: r.abstract?.p?.$ ?? '',
  }
}

async function searchOps(
  cqlQuery: string,
  opts: PatentSearchOptions
): Promise<EUPatent[]> {
  const url = `${OPS_BASE}/published-data/search/biblio?q=${encodeURIComponent(cqlQuery)}&Range=1-${opts.limit ?? 25}`
  const res = await fetchJSON<OpsResponse>(url, {
    ...opts,
    source: 'eu:epo',
    headers: { authorization: `Bearer ${opts.accessToken}`, ...(opts.headers ?? {}) },
  })
  const rows = res['world-patent-data']?.['biblio-search']?.['search-result']?.['publication-reference'] ?? []
  return rows.map(mapPatent)
}

export const epo = {
  async search(queryText: string, opts: PatentSearchOptions): Promise<EUPatent[]> {
    return searchOps(`ti=${queryText}`, opts)
  },

  async byApplicant(name: string, opts: PatentSearchOptions): Promise<EUPatent[]> {
    return searchOps(`pa="${name}"`, opts)
  },

  async detail(patentId: string, opts: PatentSearchOptions): Promise<EUPatentDetail | null> {
    const url = `${OPS_BASE}/published-data/publication/docdb/${encodeURIComponent(patentId)}/biblio,abstract,claims`
    try {
      const res = await fetchJSON<{ rawDetail?: { claims?: string; description?: string; classifications?: string[] } & OpsBibRow }>(
        url,
        {
          ...opts,
          source: 'eu:epo',
          headers: { authorization: `Bearer ${opts.accessToken}`, ...(opts.headers ?? {}) },
        }
      )
      const raw = res.rawDetail ?? {}
      const base = mapPatent(raw)
      return {
        ...base,
        claims: raw.claims ?? '',
        description: raw.description ?? '',
        classifications: raw.classifications ?? [],
      }
    } catch {
      return null
    }
  },
}
