import { fetchJSON } from 'eudata-common'
import type {
  RequestOptions,
  SanctionedEntity,
  SanctionsMatch,
  SanctionsOptions,
  SanctionsResult,
} from './types.js'

const EU_SANCTIONS_URL = 'https://data.europa.eu/api/hub/store/data/consolidated-list.json'

interface RawEntry {
  id?: string
  name?: string
  aliases?: string[]
  type?: 'person' | 'entity'
  program?: string
  designationDate?: string
  reason?: string
  birthDate?: string
  nationality?: string
}

function mapEntry(r: RawEntry): SanctionedEntity {
  const entity: SanctionedEntity = {
    entityId: r.id ?? '',
    name: r.name ?? '',
    aliases: r.aliases ?? [],
    type: r.type ?? 'entity',
    program: r.program ?? '',
    designationDate: r.designationDate ?? '',
    reason: r.reason ?? '',
  }
  if (r.birthDate !== undefined) entity.birthDate = r.birthDate
  if (r.nationality !== undefined) entity.nationality = r.nationality
  return entity
}

function fuzzyScore(query: string, name: string): number {
  const q = query.toLowerCase()
  const n = name.toLowerCase()
  if (n === q) return 1
  if (n.includes(q) || q.includes(n)) return 0.9
  const qTokens = new Set(q.split(/\s+/).filter(Boolean))
  const nTokens = new Set(n.split(/\s+/).filter(Boolean))
  if (qTokens.size === 0 || nTokens.size === 0) return 0
  let common = 0
  for (const t of qTokens) if (nTokens.has(t)) common++
  return common / Math.max(qTokens.size, nTokens.size)
}

function entryToMatch(e: SanctionedEntity, score: number): SanctionsMatch {
  return {
    entityId: e.entityId,
    name: e.name,
    aliases: e.aliases,
    type: e.type,
    program: e.program,
    designationDate: e.designationDate,
    reason: e.reason,
    score,
  }
}

let cachedList: SanctionedEntity[] | null = null

async function loadList(opts?: RequestOptions): Promise<SanctionedEntity[]> {
  if (cachedList) return cachedList
  const res = await fetchJSON<{ entries?: RawEntry[] }>(EU_SANCTIONS_URL, {
    ...(opts ?? {}),
    source: 'eu:sanctions',
  })
  cachedList = (res.entries ?? []).map(mapEntry)
  return cachedList
}

export const sanctions = {
  async check(name: string, opts?: SanctionsOptions): Promise<SanctionsResult> {
    return sanctions.screen(name, opts?.threshold ?? 0.85, opts).then((matches) => ({
      query: name,
      matched: matches.length > 0,
      matches,
    }))
  },

  async checkById(entityId: string, opts?: RequestOptions): Promise<SanctionsResult> {
    const list = await loadList(opts)
    const found = list.find((e) => e.entityId === entityId)
    return {
      query: entityId,
      matched: !!found,
      matches: found ? [entryToMatch(found, 1)] : [],
    }
  },

  async downloadList(opts?: RequestOptions): Promise<SanctionedEntity[]> {
    return loadList(opts)
  },

  async screen(
    name: string,
    threshold = 0.85,
    opts?: RequestOptions
  ): Promise<SanctionsMatch[]> {
    const list = await loadList(opts)
    const out: SanctionsMatch[] = []
    for (const e of list) {
      const nameScore = fuzzyScore(name, e.name)
      const aliasScore = Math.max(0, ...e.aliases.map((a) => fuzzyScore(name, a)))
      const score = Math.max(nameScore, aliasScore)
      if (score >= threshold) out.push(entryToMatch(e, score))
    }
    out.sort((a, b) => b.score - a.score)
    return out
  },

  resetCache(): void {
    cachedList = null
  },
}
