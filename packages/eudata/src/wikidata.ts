import { fetchJSON } from 'eudata-common'
import type { RequestOptions } from './types.js'

const WD_SPARQL = 'https://query.wikidata.org/sparql'

export interface WikidataCompany {
  qid: string
  name: string
  description: string | null
  founded: string | null
  headquarters: string | null
  industry: string | null
  ticker: string | null
  isin: string | null
  lei: string | null
  website: string | null
  parent: { qid: string; name: string } | null
  subsidiaries: Array<{ qid: string; name: string }>
}

interface SparqlBinding {
  type: string
  value: string
}

interface SparqlRow {
  item?: SparqlBinding
  itemLabel?: SparqlBinding
  itemDescription?: SparqlBinding
  founded?: SparqlBinding
  hq?: SparqlBinding
  hqLabel?: SparqlBinding
  industry?: SparqlBinding
  industryLabel?: SparqlBinding
  ticker?: SparqlBinding
  isin?: SparqlBinding
  lei?: SparqlBinding
  website?: SparqlBinding
  parent?: SparqlBinding
  parentLabel?: SparqlBinding
  sub?: SparqlBinding
  subLabel?: SparqlBinding
}

interface SparqlResponse {
  results?: { bindings?: SparqlRow[] }
}

const SEARCH_TEMPLATE = (q: string): string => `
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?founded ?hq ?hqLabel
  ?industry ?industryLabel ?ticker ?isin ?lei ?website ?parent ?parentLabel ?sub ?subLabel
WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch".
    bd:serviceParam wikibase:endpoint "www.wikidata.org".
    bd:serviceParam mwapi:search "${q.replace(/"/g, '\\"')}".
    bd:serviceParam mwapi:language "en".
    ?item wikibase:apiOutputItem mwapi:item.
  }
  ?item wdt:P31/wdt:P279* wd:Q43229.
  OPTIONAL { ?item wdt:P571 ?founded. }
  OPTIONAL { ?item wdt:P159 ?hq. }
  OPTIONAL { ?item wdt:P452 ?industry. }
  OPTIONAL { ?item wdt:P249 ?ticker. }
  OPTIONAL { ?item wdt:P946 ?isin. }
  OPTIONAL { ?item wdt:P1278 ?lei. }
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item wdt:P749 ?parent. }
  OPTIONAL { ?item wdt:P355 ?sub. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 50
`

function aggregate(rows: SparqlRow[]): WikidataCompany | null {
  if (rows.length === 0) return null
  const first = rows[0]!
  const subsidiaries: WikidataCompany['subsidiaries'] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (r.sub?.value && r.subLabel?.value && !seen.has(r.sub.value)) {
      seen.add(r.sub.value)
      subsidiaries.push({
        qid: r.sub.value.split('/').pop() ?? '',
        name: r.subLabel.value,
      })
    }
  }
  return {
    qid: first.item?.value.split('/').pop() ?? '',
    name: first.itemLabel?.value ?? '',
    description: first.itemDescription?.value ?? null,
    founded: first.founded?.value ?? null,
    headquarters: first.hqLabel?.value ?? null,
    industry: first.industryLabel?.value ?? null,
    ticker: first.ticker?.value ?? null,
    isin: first.isin?.value ?? null,
    lei: first.lei?.value ?? null,
    website: first.website?.value ?? null,
    parent:
      first.parent?.value && first.parentLabel?.value
        ? {
            qid: first.parent.value.split('/').pop() ?? '',
            name: first.parentLabel.value,
          }
        : null,
    subsidiaries,
  }
}

export const wikidata = {
  async byName(query: string, opts?: RequestOptions): Promise<WikidataCompany | null> {
    const url = `${WD_SPARQL}?query=${encodeURIComponent(SEARCH_TEMPLATE(query))}&format=json`
    try {
      const res = await fetchJSON<SparqlResponse>(url, {
        ...(opts ?? {}),
        source: 'eu:wikidata',
        headers: { accept: 'application/sparql-results+json' },
      })
      return aggregate(res.results?.bindings ?? [])
    } catch {
      return null
    }
  },
}
