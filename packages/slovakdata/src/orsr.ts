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

const ROLE_RE = /-\s*(Predseda predstavenstva|Podpredseda predstavenstva|Člen predstavenstva|Konateľ|Likvidátor)/i

/**
 * ORSR renders each director as a single cell containing:
 *   "FirstName LastName[, jobtitle] - Role Street Number City PSC Country Vznik funkcie: date"
 * Members of Dozorná rada / Prokúra omit the "- Role" separator.
 * Strategy: find every <td> containing "Vznik funkcie", parse name/role/date.
 */
function extractDirectors(root: HTMLElement): SKDirector[] {
  const out: SKDirector[] = []
  const seen = new Set<string>()
  // Restrict to the cells that belong to the statutory body. The ORSR
  // page lists Štatutárny orgán → Konanie → Dozorná rada → Prokúra
  // in document order, so we only take cells appearing before the
  // "Konanie menom spoločnosti" boundary.
  const tds = root.querySelectorAll('td')
  let inBody = false
  for (let i = 0; i < tds.length; i++) {
    const cell = tds[i]
    if (!cell) continue
    const t = normalizeText(cell.text)
    if (/^Štatutárny orgán|^Konateľ:|^Predstavenstvo:|^Likvidátor:/i.test(t)) {
      inBody = true
      continue
    }
    if (/^Konanie|^Dozorná rada|^Prokúra|^Akcionár|^Spoločníci|^Výška základného/i.test(t)) {
      inBody = false
      continue
    }
    if (!inBody) continue
    if (!t.includes('Vznik funkcie')) continue
    const stripped = stripOdSuffix(t)
    const beforeVznik = stripped.split(/Vznik funkcie/i)[0] ?? ''
    const roleMatch = ROLE_RE.exec(beforeVznik)
    const namePart = (roleMatch ? beforeVznik.slice(0, roleMatch.index) : beforeVznik).split(',')[0] ?? ''
    const cleaned = cleanName(namePart)
    const tokens = cleaned.split(/\s+/).filter((tok) => /^[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(tok))
    if (tokens.length < 2) continue
    const fullName = tokens.slice(0, 3).join(' ')
    const role = roleMatch ? roleMatch[1]!.toLowerCase() : 'konateľ'
    if (seen.has(fullName)) continue
    seen.add(fullName)
    out.push({ name: fullName, role, since: null, until: null, address: null })
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
