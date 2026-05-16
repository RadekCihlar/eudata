import { fetchText } from 'eudata-common'
import type { CommercialRegisterEntry, CourtDecision, Director, RequestOptions } from './types.js'
import { assertValidICO } from './utils.js'

const OR_BASE = 'https://or.justice.cz/ias/ui/rejstrik-firma.vysledky'
const JUSTICE_SEARCH = 'https://www.justice.cz/search'

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDirectors(html: string): Director[] {
  const blockMatch = html.match(/jednatel[\s\S]{0,5000}?<\/div>/i)
  if (!blockMatch) return []
  const text = stripTags(blockMatch[0])
  const names = text.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+/g) ?? []
  const unique = Array.from(new Set(names))
  return unique.map((name) => ({
    name,
    role: 'jednatel',
    since: null,
    until: null,
    address: null,
  }))
}

export const court = {
  async commercialRegister(ico: string, opts?: RequestOptions): Promise<CommercialRegisterEntry> {
    const valid = assertValidICO(ico)
    const url = `${OR_BASE}?subjektId=${valid}&typ=PLATNY`
    const html = await fetchText(url, { ...(opts ?? {}), source: 'cz:justice' })
    const text = stripTags(html)
    const nameMatch = /Obchodní firma:\s*([^|]+?)\s*Sídlo:/i.exec(text)
    const capitalMatch = /Základní kapitál:\s*([\d\s]+)\s*Kč/i.exec(text)
    const sectionMatch = /oddíl\s+([A-Z]+),\s*vložka\s+(\d+)/i.exec(text)
    const courtMatch = /[Vv]edená u\s+([^,]+?)\s+(?:od|spisová)/i.exec(text)
    return {
      ico: valid,
      name: nameMatch?.[1]?.trim() ?? '',
      registeredAt: courtMatch?.[1]?.trim() ?? '',
      section: sectionMatch?.[1] ?? '',
      fileNumber: sectionMatch?.[2] ?? '',
      registeredCapital: capitalMatch ? Number(capitalMatch[1]!.replace(/\s/g, '')) : null,
      directors: extractDirectors(html),
      shareholders: [],
    }
  },

  async directors(ico: string, opts?: RequestOptions): Promise<Director[]> {
    const entry = await court.commercialRegister(ico, opts)
    return entry.directors
  },

  async searchDecisions(query: string, opts?: RequestOptions): Promise<CourtDecision[]> {
    const url = `${JUSTICE_SEARCH}?q=${encodeURIComponent(query)}`
    const html = await fetchText(url, { ...(opts ?? {}), source: 'cz:justice' })
    const rowMatches = html.match(/<div[^>]*class="[^"]*decision[^"]*"[^>]*>[\s\S]*?<\/div>/gi) ?? []
    return rowMatches.map((row) => {
      const text = stripTags(row)
      return {
        court: '',
        fileReference: (text.match(/\b\d+\s+[A-Z]+\s+\d+\/\d+\b/) ?? [''])[0]!,
        date: (text.match(/\b\d{4}-\d{2}-\d{2}\b/) ?? [''])[0]!,
        type: '',
        summary: text.slice(0, 200),
      }
    })
  },
}
