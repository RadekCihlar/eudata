import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const SPARQL_BASE = 'https://publications.europa.eu/webapi/rdf/sparql'
const EURLEX_HTML = 'https://eur-lex.europa.eu/legal-content'

export interface EurlexDocument {
  celex: string
  title: string | null
  date: string | null
  type: string | null
  subjects: string[]
  oj: string | null
  urls: {
    html: Record<string, string>
    pdf: Record<string, string>
  }
}

export interface EurlexSearchOptions extends RequestOptions {
  query: string
  language?: string
  limit?: number
}

interface SparqlBinding {
  type: 'uri' | 'literal' | 'typed-literal' | 'bnode'
  value: string
}

interface SparqlResults {
  head?: { vars?: string[] }
  results?: { bindings?: Array<Record<string, SparqlBinding>> }
}

function buildMetaQuery(celex: string, language: string): string {
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?title ?date ?type ?subject WHERE {
  ?work cdm:resource_legal_id_celex "${celex}"^^<http://www.w3.org/2001/XMLSchema#string> .
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?work ;
          cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${language.toUpperCase()}> ;
          cdm:expression_title ?title .
  }
  OPTIONAL { ?work cdm:work_date_document ?date . }
  OPTIONAL { ?work cdm:work_has_resource-type ?type . }
  OPTIONAL { ?work cdm:resource_legal_is_about_subject-matter ?subject . }
} LIMIT 50`
}

function buildSearchQuery(query: string, language: string, limit: number): string {
  const safe = query.replace(/"/g, '\\"')
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?celex ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  ?expr cdm:expression_belongs_to_work ?work ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${language.toUpperCase()}> ;
        cdm:expression_title ?title .
  OPTIONAL { ?work cdm:work_date_document ?date . }
  FILTER(CONTAINS(LCASE(STR(?title)), LCASE("${safe}")))
} LIMIT ${limit}`
}

async function sparql(query: string, opts?: RequestOptions): Promise<SparqlResults> {
  const params = new URLSearchParams({ query, format: 'application/sparql-results+json' })
  const url = `${SPARQL_BASE}?${params.toString()}`
  return fetchJSON<SparqlResults>(url, {
    ...(opts ?? {}),
    source: 'eu:eurlex',
    headers: { accept: 'application/sparql-results+json' },
  })
}

function distinct<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function htmlUrl(celex: string, language: string): string {
  return `${EURLEX_HTML}/${language.toUpperCase()}/TXT/HTML/?uri=CELEX:${encodeURIComponent(celex)}`
}

function pdfUrl(celex: string, language: string): string {
  return `${EURLEX_HTML}/${language.toUpperCase()}/TXT/PDF/?uri=CELEX:${encodeURIComponent(celex)}`
}

export const eurlex = {
  async byCelex(celex: string, opts?: RequestOptions & { language?: string }): Promise<EurlexDocument> {
    const normalized = celex.replace(/^CELEX:/i, '').trim()
    const lang = opts?.language ?? 'ENG'
    const res = await sparql(buildMetaQuery(normalized, lang), opts)
    const bindings = res.results?.bindings ?? []
    const first = bindings[0]
    const languages = ['EN', 'FR', 'DE']
    const htmlUrls: Record<string, string> = {}
    const pdfUrls: Record<string, string> = {}
    for (const lang of languages) {
      htmlUrls[lang] = htmlUrl(normalized, lang)
      pdfUrls[lang] = pdfUrl(normalized, lang)
    }
    return {
      celex: normalized,
      title: first?.['title']?.value ?? null,
      date: first?.['date']?.value ?? null,
      type: first?.['type']?.value.split('/').pop() ?? null,
      subjects: distinct(bindings.map((b) => b['subject']?.value.split('/').pop() ?? '').filter(Boolean)),
      oj: null,
      urls: { html: htmlUrls, pdf: pdfUrls },
    }
  },

  async search(opts: EurlexSearchOptions): Promise<Array<{ celex: string; title: string; date: string | null }>> {
    const lang = opts.language ?? 'ENG'
    const res = await sparql(buildSearchQuery(opts.query, lang, opts.limit ?? 20), opts)
    return (res.results?.bindings ?? []).map((b) => ({
      celex: b['celex']?.value ?? '',
      title: b['title']?.value ?? '',
      date: b['date']?.value ?? null,
    }))
  },
}
