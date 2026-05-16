import {
  fetchHTML,
  NotFoundError,
  normalizeText,
  parseHTML,
  textAfterLabel,
  type HTMLElement,
} from 'eudata-common'
import type { RequestOptions, SKCompanyInfo, SKDirector } from './types.js'
import { assertValidICO, normalizeAddress, type OrsfAddressRaw } from './utils.js'

const ORSR_BASE = 'https://www.orsr.sk'

interface SearchHit {
  detailUrl: string
  spis: string
}

function findDetailLink(root: HTMLElement): SearchHit | null {
  const anchors = root.querySelectorAll('a')
  for (const a of anchors) {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('vypis.asp?ID=') || href.startsWith('/vypis.asp?ID=')) {
      return {
        detailUrl: href.startsWith('/') ? `${ORSR_BASE}${href}` : `${ORSR_BASE}/${href}`,
        spis: normalizeText(a.text),
      }
    }
  }
  return null
}

function stripOdSuffix(s: string | null): string {
  if (!s) return ''
  return s.replace(/\s*\(\s*(?:od|do)\s*:\s*[^)]*\)\s*/gi, '').replace(/\s+/g, ' ').trim()
}

function cleanName(s: string): string {
  return s.replace(/[ \s]+/g, ' ').trim()
}

function parseDate(s: string | null): string | null {
  if (!s) return null
  const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s)
  if (!m) return null
  return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
}

function extractAddress(root: HTMLElement): OrsfAddressRaw {
  const txt = stripOdSuffix(textAfterLabel(root, 'Sídlo'))
  const m = /^(.+?)\s+(\d[\d\/]*)\s*,?\s*(\d{3}\s*\d{2})?\s*(.+?)$/.exec(txt)
  if (!m) return {}
  return {
    ulica: cleanName(m[1] ?? ''),
    cisloDomu: m[2] ?? '',
    psc: m[3]?.replace(/\s/g, '') ?? '',
    obec: cleanName(m[4] ?? ''),
  }
}

function extractDirectors(root: HTMLElement): SKDirector[] {
  const out: SKDirector[] = []
  const allText = root.text
  const blockMatch = /Štatutárny\s+orgán:?\s*([\s\S]{0,3000}?)(?:Konanie|Likvidácia|Akcionár|Spoločníci|$)/.exec(allText)
  if (!blockMatch) return out
  const block = blockMatch[1] ?? ''
  const nameRegex = /([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+(?:\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+)?)/g
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = nameRegex.exec(block)) !== null) {
    const name = cleanName(m[1]!)
    if (seen.has(name)) continue
    seen.add(name)
    out.push({
      name,
      role: 'konateľ',
      since: null,
      until: null,
      address: null,
    })
  }
  return out
}

function parseDetail(html: string, ico: string): SKCompanyInfo {
  const root = parseHTML(html)
  const name = stripOdSuffix(textAfterLabel(root, 'Obchodné meno'))
  const legalForm = stripOdSuffix(textAfterLabel(root, 'Právna forma'))
  const founded = parseDate(textAfterLabel(root, 'Deň zápisu'))
  const dissolved = parseDate(textAfterLabel(root, 'Deň výmazu'))
  const dic = stripOdSuffix(textAfterLabel(root, 'DIČ')) || null
  const icDph = stripOdSuffix(textAfterLabel(root, 'IČ DPH')) || null
  const capitalRaw = stripOdSuffix(textAfterLabel(root, 'Základné imanie'))
  const capitalMatch = /([\d\s,.]+)\s*(EUR|Sk)/.exec(capitalRaw)
  const registeredCapital = capitalMatch
    ? Number(capitalMatch[1]!.replace(/[\s,.]/g, '')) || null
    : null
  const sectionMatch = /Oddiel[:\s]+([A-Za-z]+)/.exec(root.text)
  const insertMatch = /Vložka\s+číslo[:\s]+([\w\/]+)/.exec(root.text)
  const courtMatch = /Výpis z Obchodného registra\s+(.+?)(?:\s*Tento|$)/.exec(root.text)

  return {
    ico,
    name: cleanName(name),
    address: normalizeAddress(extractAddress(root)),
    legalForm,
    founded,
    dissolved,
    active: !dissolved,
    dic,
    icDph,
    skNace: [],
    registeredCapital,
    currency: capitalMatch?.[2] === 'EUR' ? 'EUR' : 'SKK',
    court: cleanName(courtMatch?.[1] ?? '') || null,
    section: sectionMatch?.[1] ?? null,
    insertNumber: insertMatch?.[1] ?? null,
    directors: extractDirectors(root),
    _raw: { source: 'orsr-scrape', html: html.length },
  }
}

export const orsr = {
  async lookup(ico: string, opts?: RequestOptions): Promise<SKCompanyInfo> {
    const valid = assertValidICO(ico)
    const searchUrl = `${ORSR_BASE}/hladaj_ico.asp?ICO=${valid}&SID=0`
    const searchRoot = await fetchHTML(searchUrl, {
      ...(opts ?? {}),
      source: 'sk:orsr',
      encoding: 'windows-1250',
    })
    const hit = findDetailLink(searchRoot)
    if (!hit) {
      throw new NotFoundError(`ORSR: no record for IČO ${valid}`, {
        source: 'sk:orsr',
        url: searchUrl,
      })
    }
    const detailRoot = await fetchHTML(hit.detailUrl, {
      ...(opts ?? {}),
      source: 'sk:orsr',
      encoding: 'windows-1250',
    })
    return parseDetail(detailRoot.toString(), valid)
  },
}

export { parseDetail as _parseDetail }
